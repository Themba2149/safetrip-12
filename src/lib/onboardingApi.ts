// Talks to Supabase for the onboarding wizard. Every call returns an error STRING instead of throwing,
// so the page can show a calm message. Only the anon key is used; row security decides what a driver can see.
import { supabase, NOT_CONFIGURED_MESSAGE } from './supabase'
import { documentPath, draftToFields, validateDocumentFile } from '../data/onboarding'
import type { ApplicationRow, DocKind, OnboardingDraft } from '../data/onboarding'

export type DocumentRow = {
  id: string
  application_id: string
  kind: DocKind
  path: string
  mime: string
  size_bytes: number
  created_at: string
}

const DOC_COLUMNS = 'id, application_id, kind, path, mime, size_bytes, created_at'

export async function loadApplication(): Promise<{ row: ApplicationRow | null; docs: DocumentRow[]; error: string }> {
  if (!supabase) return { row: null, docs: [], error: NOT_CONFIGURED_MESSAGE }
  const { data, error } = await supabase.from('driver_applications').select('*').maybeSingle()
  if (error) return { row: null, docs: [], error: 'We could not load your application. Try again.' }
  const row = (data ?? null) as ApplicationRow | null
  if (!row) return { row: null, docs: [], error: '' }
  const docs = await loadDocuments(row.id)
  return { row, docs: docs.rows, error: docs.error }
}

export async function loadDocuments(applicationId: string): Promise<{ rows: DocumentRow[]; error: string }> {
  if (!supabase) return { rows: [], error: NOT_CONFIGURED_MESSAGE }
  const { data, error } = await supabase
    .from('application_documents')
    .select(DOC_COLUMNS)
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
  if (error) return { rows: [], error: 'We could not load your documents.' }
  return { rows: (data ?? []) as DocumentRow[], error: '' }
}

/** Saves the answers so far. Creates the application the first time. */
export async function saveApplication(
  userId: string,
  existing: ApplicationRow | null,
  draft: OnboardingDraft,
  step: number,
): Promise<{ row: ApplicationRow | null; error: string }> {
  if (!supabase) return { row: null, error: NOT_CONFIGURED_MESSAGE }
  const fields = draftToFields(draft)
  const query = existing
    ? supabase.from('driver_applications').update({ ...fields, step }).eq('id', existing.id)
    : supabase.from('driver_applications').insert({ ...fields, step, user_id: userId })
  const { data, error } = await query.select('*').single()
  if (error) return { row: null, error: 'We could not save your application. Check your connection and try again.' }
  return { row: data as ApplicationRow, error: '' }
}

/** Moves a complete application to "submitted". The database checks completeness again and refuses if anything is missing. */
export async function submitApplication(applicationId: string): Promise<{ row: ApplicationRow | null; error: string }> {
  if (!supabase) return { row: null, error: NOT_CONFIGURED_MESSAGE }
  const { data, error } = await supabase
    .from('driver_applications')
    .update({ status: 'submitted' })
    .eq('id', applicationId)
    .select('*')
    .single()
  if (error) return { row: null, error: error.message.length < 160 ? error.message : 'We could not submit your application. Try again.' }
  return { row: data as ApplicationRow, error: '' }
}

export async function uploadDocument(
  userId: string,
  applicationId: string,
  kind: DocKind,
  file: File,
): Promise<{ doc: DocumentRow | null; error: string }> {
  if (!supabase) return { doc: null, error: NOT_CONFIGURED_MESSAGE }
  const problem = validateDocumentFile(file)
  if (problem) return { doc: null, error: problem }

  const path = documentPath(userId, kind, crypto.randomUUID(), file.type)
  const upload = await supabase.storage.from('driver-documents').upload(path, file, { contentType: file.type, upsert: false })
  if (upload.error) return { doc: null, error: 'The upload failed. Check your connection and try again.' }

  const { data, error } = await supabase
    .from('application_documents')
    .insert({ application_id: applicationId, user_id: userId, kind, path, mime: file.type, size_bytes: file.size })
    .select(DOC_COLUMNS)
    .single()
  if (error) {
    await supabase.storage.from('driver-documents').remove([path]) // do not leave an orphan file behind
    return { doc: null, error: 'We could not record that upload. Try again.' }
  }
  return { doc: data as DocumentRow, error: '' }
}

export async function removeDocument(doc: DocumentRow): Promise<string> {
  if (!supabase) return NOT_CONFIGURED_MESSAGE
  const { error } = await supabase.from('application_documents').delete().eq('id', doc.id)
  if (error) return 'We could not remove that document.'
  await supabase.storage.from('driver-documents').remove([doc.path])
  return ''
}

/** A link that works for 60 seconds, so documents are never at a permanent public address. */
export async function documentLink(doc: DocumentRow): Promise<{ url: string; error: string }> {
  if (!supabase) return { url: '', error: NOT_CONFIGURED_MESSAGE }
  const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(doc.path, 60)
  if (error || !data) return { url: '', error: 'We could not open that document.' }
  return { url: data.signedUrl, error: '' }
}
