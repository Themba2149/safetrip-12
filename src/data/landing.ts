// Words and numbers for the public SafeTrip home page. All figures come from the SafeTrip solution deck.
// Market and pilot numbers are estimates or proposals to be validated in the pilot, and the page says so.

export type Stat = { value: string; label: string }
export type Step = { title: string; text: string }
export type EarnRow = { action: string; points: string }
export type CompareRow = { topic: string; traditional: string; telematics: string; safetrip: string }
export type Faq = { question: string; answer: string }
export type Layer = { name: string; items: string[] }

export const STATS: Stat[] = [
  { value: '13.6m', label: 'vehicles registered in South Africa (eNaTIS, Sept 2025)' },
  { value: '65-70%', label: 'estimated uninsured, about 8.8 to 9.5 million vehicles (SAIA / AA)' },
  { value: '11,418', label: 'road deaths in 2025, from 9,674 crashes (Dept of Transport)' },
  { value: 'R850', label: 'SafeTrip price point, and a premium that can only go down' },
]

export const STEPS: Step[] = [
  { title: 'Check before you drive', text: 'Pick where you are leaving from and going to. SafeTrip looks at weather, traffic, route risk and your vehicle.' },
  { title: 'Get clear advice', text: 'Travel now, Wait, Reroute or Avoid travel, with the reason in plain words and the safest time to leave.' },
  { title: 'Choose the safer option', text: 'Take the safer route or leave later. You stay in charge. The advice supports your decision.' },
  { title: 'Earn points, pay less', text: '100 points is 1% off your premium, up to 15%. Your premium can only go down.' },
]

export const EARN_TABLE: EarnRow[] = [
  { action: 'Safe arrival', points: '+5' },
  { action: 'Safer route or option', points: '5 to 40' },
  { action: 'Vehicle maintenance', points: '15 to 25' },
  { action: 'Hail avoidance', points: '+20' },
  { action: 'Break on a long trip', points: '+15' },
]

export const COMPARE: CompareRow[] = [
  { topic: 'Timing', traditional: 'After the accident', telematics: 'After the trip', safetrip: 'Before the trip' },
  { topic: 'Risk management', traditional: 'Pays the loss', telematics: 'Scores past behaviour', safetrip: 'Prevents the loss' },
  { topic: 'Customer experience', traditional: 'Claims and paperwork', telematics: 'Monitored and judged', safetrip: 'Guided and rewarded' },
  { topic: 'Premium impact', traditional: 'Fixed, can rise', telematics: 'Can rise with score', safetrip: 'Can only go down' },
]

export const AI_LAYERS: Layer[] = [
  { name: 'Application AI', items: ['Trip advisor', 'Risk scoring', 'Recommendations'] },
  { name: '5G Core AI', items: ['Mobility insights', 'Congestion detection', 'Anomaly detection'] },
  { name: 'AI-RAN', items: ['Hazard processing', 'Crash detection', 'Edge intelligence'] },
]

export const INSURER_POINTS: string[] = [
  'See the drivers who chose to share their profile, car and policy details with you.',
  'Follow live pilot totals: advice checks, points awarded and how many drivers followed the advice.',
  'Understand the effect on claims and premiums with the pilot portfolio view.',
  'Drivers stay in control. Sharing is a tick box they can turn off at any time.',
]

export const PILOT: Stat[] = [
  { value: 'Gauteng', label: 'proposed pilot location' },
  { value: '5,000', label: 'proposed drivers' },
  { value: '1', label: 'partner insurer, via alliance' },
  { value: '6 months', label: 'proposed timeline' },
]

export const FAQS: Faq[] = [
  {
    question: 'Is SafeTrip available to buy right now?',
    answer:
      'Not yet. SafeTrip is a prototype built for the MTN Group Technology Hackathon 2026. The screens work with a demo insurer and simulated data. A six-month pilot in Gauteng is proposed to prove it with real drivers.',
  },
  {
    question: 'Can my premium go up?',
    answer:
      'No. In SafeTrip your premium can only go down. Starting from R850 a month, every 100 points takes 1% off, up to 15%. We reward safer choices and we never punish drivers.',
  },
  {
    question: 'How do I earn points?',
    answer:
      'By making safer choices: arriving safely, choosing a safer route or time, keeping your vehicle maintained, avoiding hail, and taking a break on a long trip. The table on this page lists the points for each.',
  },
  {
    question: 'Does the AI decide for me?',
    answer:
      'No. AI supports your decision and does not replace the driver. SafeTrip gives advice before you leave, and you choose what to do.',
  },
  {
    question: 'What data does the advice use?',
    answer:
      'The Trip Advisor uses a live weather forecast for where you leave from. Traffic and route risk are estimated in this prototype. The full product proposes to use MTN network intelligence for real-time traffic and hazard signals.',
  },
  {
    question: 'Who can see my information?',
    answer:
      'Your profile, car and policy details are shared with an insurer only if you tick the sharing box, and you can turn it off later. The places you search for are not saved in our database. Place search and routes use OpenStreetMap services.',
  },
  {
    question: 'I work for an insurer. How do I get access?',
    answer:
      'Insurer accounts are created by an administrator. Use the Insurer option on the sign-in page once your account is ready.',
  },
]

export const SOURCES =
  'Sources: eNaTIS via TopAuto; SAIA / AA; Dept of Transport, Jan 2026; Business Day, Oct 2026; Sunday Independent, 7 Apr 2026; Naked, 2026; Standard Bank Insurance.'