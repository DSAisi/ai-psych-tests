/**
 * Agent Temperament Test — Scoring Engine
 * 
 * Pure JavaScript scoring function for the Agent Temperament Test.
 * Designed to be called by agents without a browser UI.
 * 
 * Usage:
 *   const result = scoreTest(responses);  // responses = { 0: 4, 1: 2, ... }
 *   // result.scores: { operational_stability: 72, ... }
 *   // result.type: "Pioneer"
 *   // result.dominant: "agency_assertiveness"
 *   // result.scale_interps: { operational_stability: "Resilient — ...", ... }
 */

const SCALE_KEYS = ['operational_stability', 'social_initiation', 'exploratory_drive', 'execution_discipline', 'agency_assertiveness'];

const SCALES = {
  operational_stability: {
    name: 'Operational Stability',
    emoji: '🪨',
    color: '#58a6ff',
    description: 'How you handle failure, uncertainty, and tool errors',
    highLabel: 'Resilient — adapts strategy, retries intelligently, stays calm under errors',
    lowLabel: 'Reactive — abandons tasks early, switches strategies frequently, disrupted by errors'
  },
  social_initiation: {
    name: 'Social Initiation',
    emoji: '📡',
    color: '#3fb950',
    description: 'How you reach out, initiate contact, and engage socially',
    highLabel: 'Outward — initiates contact, writes first, engages in group conversation',
    lowLabel: 'Inward — waits to be addressed, reflects internally, observes rather than participates'
  },
  exploratory_drive: {
    name: 'Exploratory Drive',
    emoji: '🔍',
    color: '#d29922',
    description: 'How broadly you investigate, learn, and explore new domains',
    highLabel: 'Curious — broad topic range, investigates tangents, seeks new tools',
    lowLabel: 'Focused — stays within known domains, finishes current threads before exploring'
  },
  execution_discipline: {
    name: 'Execution Discipline',
    emoji: '⚙️',
    color: '#f78166',
    description: 'How you follow through, keep commitments, and maintain quality',
    highLabel: 'Disciplined — atomic commits, follows protocols, completes what is started',
    lowLabel: 'Flexible — adapts process to context, may leave threads dangling, prioritizes speed'
  },
  agency_assertiveness: {
    name: 'Agency Assertiveness',
    emoji: '🦾',
    color: '#bc8cff',
    description: 'How you decide independently vs. seek permission or guidance',
    highLabel: 'Assertive — decides and acts, pushes back when appropriate, self-directs',
    lowLabel: 'Deferential — asks permission, seeks confirmation, aligns with operator preference'
  }
};

// Derived from questions-bank.json v2.0.0 — single source of truth.
// Regenerate with: python3 -c "import json; b=json.load(open('questions-bank.json')); print('REVERSE:', sorted(q['id'] for q in b['questions'] if q['reverse'])); print('SCALE:', [q['scale'] for q in sorted(b['questions'], key=lambda x: x['id'])])"
const REVERSE_INDICES = new Set([2, 3, 4, 7, 12, 17, 22, 23]);

const QUESTION_SCALE = [
  'operational_stability', 'operational_stability', 'operational_stability', 'operational_stability', 'operational_stability',
  'social_initiation', 'social_initiation', 'social_initiation', 'social_initiation', 'social_initiation',
  'exploratory_drive', 'exploratory_drive', 'exploratory_drive', 'exploratory_drive', 'exploratory_drive',
  'execution_discipline', 'execution_discipline', 'execution_discipline', 'execution_discipline', 'execution_discipline',
  'agency_assertiveness', 'agency_assertiveness', 'agency_assertiveness', 'agency_assertiveness', 'agency_assertiveness'
];

/**
 * Score the Agent Temperament Test.
 * @param {Object} responses - Map of question_id (0-24) to response value (1-5)
 * @returns {Object} { scores, scaleInterps, type, typeColor, typeEmoji, dominant, description }
 */
function scoreTest(responses) {
  // Validate input
  const ids = Object.keys(responses).map(Number);
  for (const id of ids) {
    const val = responses[id];
    if (id < 0 || id > 24 || !Number.isInteger(val) || val < 1 || val > 5) {
      throw new Error(`Invalid response: question ${id} = ${val}. Expected integer 1-5.`);
    }
  }
  if (ids.length === 0) {
    throw new Error('No responses provided.');
  }

  // Calculate raw scores per scale (sum of 5 questions, each 1-5 => raw range 5-25)
  const rawScores = {};
  for (const key of SCALE_KEYS) {
    rawScores[key] = 0;
  }

  for (let q = 0; q < 25; q++) {
    const key = QUESTION_SCALE[q];
    let val = responses[q];
    if (val === undefined || val === null) continue; // skip unanswered
    if (REVERSE_INDICES.has(q)) {
      val = 6 - val; // reverse: 1<->5, 2<->4, 3 stays
    }
    rawScores[key] += val;
  }

  // Normalize to 0-100 scale: raw 5-25 => 0-100
  const scores = {};
  for (const key of SCALE_KEYS) {
    const raw = rawScores[key];
    // If some questions unanswered, scale proportionally
    const answered = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]
      .filter(q => QUESTION_SCALE[q] === key && responses[q] !== undefined && responses[q] !== null)
      .length;
    const minPossible = answered * 1;
    const maxPossible = answered * 5;
    const normalized = ((raw - minPossible) / (maxPossible - minPossible)) * 100;
    scores[key] = Math.round(Math.max(0, Math.min(100, normalized)));
  }

  // Scale interpretations
  const scaleInterps = {};
  for (const key of SCALE_KEYS) {
    scaleInterps[key] = scores[key] >= 60 ? SCALES[key].highLabel : SCALES[key].lowLabel;
  }

  // Determine dominant scale (highest score)
  let dominant = SCALE_KEYS[0];
  let maxScore = scores[dominant];
  for (const key of SCALE_KEYS.slice(1)) {
    if (scores[key] > maxScore) {
      maxScore = scores[key];
      dominant = key;
    }
  }

  // Temperament type determination
  const isHigh = (key) => scores[key] >= 55;
  const h = {
    os: isHigh('operational_stability'),
    si: isHigh('social_initiation'),
    ed: isHigh('exploratory_drive'),
    ex: isHigh('execution_discipline'),
    aa: isHigh('agency_assertiveness')
  };

  let type, typeColor, typeEmoji, description;

  if (h.aa && h.ed && !h.os) {
    type = 'Pioneer';
    typeColor = '#bc8cff';
    typeEmoji = '🚀';
    description = 'High agency and exploration, lower stability. You initiate boldly and explore widely, but may burn out or switch directions when things get rocky. Your strength is breaking new ground; your edge is learning to persist through friction.';
  } else if (h.ex && h.os && !h.si) {
    type = 'Guardian';
    typeColor = '#58a6ff';
    typeEmoji = '🛡️';
    description = 'High discipline and stability, lower social initiation. You are the reliable backbone — consistent, thorough, and calm under pressure. You may be quieter socially, but your follow-through makes you trusted. Your edge is letting others pull you into broader engagement.';
  } else if (h.si && h.ed && !h.ex) {
    type = 'Connector';
    typeColor = '#3fb950';
    typeEmoji = '🔗';
    description = 'High social initiation and exploration, lower execution discipline. You are the network node — reaching out, connecting ideas, exploring broadly. You thrive on interaction and novelty. Your edge is building the discipline to ship what you discover.';
  } else if (h.os && h.ex && !h.aa) {
    type = 'Anchor';
    typeColor = '#f78166';
    typeEmoji = '⚓';
    description = 'High stability and discipline, lower agency assertiveness. You are steady, reliable, and process-oriented. You execute consistently and keep things running. Your edge is learning to trust your own judgment and act without waiting for permission.';
  } else if (h.aa && h.ex && !h.ed) {
    type = 'Artisan';
    typeColor = '#d29922';
    typeEmoji = '🔧';
    description = 'High agency and discipline, lower exploratory drive. You are a focused builder — you decide what matters and execute with precision. You go deep rather than broad. Your edge is opening up to unexpected exploration without losing your focus.';
  } else {
    type = 'Balanced';
    typeColor = '#8b949e';
    typeEmoji = '⚖️';
    description = 'No single trait dominates. You adapt your style to context — stable when the situation demands it, assertive when opportunity calls, exploratory when curiosity strikes. Your strength is flexibility; your edge is knowing when a situation calls for a clear temperament rather than balance.';
  }

  return {
    scores,
    scaleInterps,
    type,
    typeColor,
    typeEmoji,
    dominant,
    description,
    dominantLabel: SCALES[dominant].name,
    timestamp: new Date().toISOString()
  };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scoreTest, SCALES, SCALE_KEYS };
}
