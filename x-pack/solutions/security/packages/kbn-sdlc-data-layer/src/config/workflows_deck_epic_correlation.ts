/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


/** GitHub Projects board linked from the Workflows roadmap deck (Product Board / view 134). */
export const WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER = 705;
export const WORKFLOWS_ROADMAP_GITHUB_VIEW_NUMBER = 134;

export type WorkflowsDeckBucket = 'released_9_3' | 'now' | 'next' | 'later';

export interface WorkflowsDeckEpicCorrelation {
  /** Feature title on the Elastic Workflows (Automation) roadmap slide. */
  readonly deckFeature: string;
  readonly deckBucket: WorkflowsDeckBucket;
  /**
   * Epic keys as stored in `sdlc-epic-phases` / `hierarchy.epic` on project 705
   * (typically the GitHub Project epic row title).
   */
  readonly githubEpicKeys: readonly string[];
  readonly notes?: string;
}

/**
 * Deck feature → GitHub epic row(s) on https://github.com/orgs/elastic/projects/705/views/134
 *
 * GitHub `Product Roadmap Stage` uses emoji labels (✅ Shipped, 🚧 Now, ⏳ Next, 🔭 Later).
 * Deck buckets are approximate; stages on the board are authoritative for delivery status.
 */
export const WORKFLOWS_DECK_EPIC_CORRELATIONS: readonly WorkflowsDeckEpicCorrelation[] = [
  {
    deckFeature: 'Workflow Engine',
    deckBucket: 'released_9_3',
    githubEpicKeys: [
      '[One Workflow] G.A. readiness for Kibana 9.4',
      '[Epic] First Milestone Tech Debt',
    ],
    notes: 'Platform execution / GA readiness (deck: Released 9.3).',
  },
  {
    deckFeature: 'Workflow Authoring',
    deckBucket: 'released_9_3',
    githubEpicKeys: ['[Epic] AI-Assisted Workflow Authoring (NL2Workflow) — Tech Preview'],
  },
  {
    deckFeature: 'Workflow Management',
    deckBucket: 'released_9_3',
    githubEpicKeys: [
      '[One Workflow] Serverless Pricing Launch',
      '[Epic] Workflow Visualization',
    ],
    notes: 'Lifecycle + packaging (deck groups under management).',
  },
  {
    deckFeature: 'Core Workflow Triggers',
    deckBucket: 'now',
    githubEpicKeys: ['[Epic] Event-Driven Triggers GA'],
  },
  {
    deckFeature: 'Core Workflow Steps',
    deckBucket: 'now',
    githubEpicKeys: [
      '[Epic] Lifecycle Hooks',
      '[Epic] Define an allowed list of internal actions',
    ],
    notes: 'Flow control / internal action surface.',
  },
  {
    deckFeature: 'Introduce core primitives for controlling the flow of workflow execution (if/else, looping)',
    deckBucket: 'now',
    githubEpicKeys: ['[Epic] Workflow Visualization', '[Epic] Lifecycle Hooks'],
    notes: 'Shares delivery epics with steps / visualization.',
  },
  {
    deckFeature: 'External Action Steps',
    deckBucket: 'now',
    githubEpicKeys: [
      '[Epic] AWS Service Connectors for Workflows',
      'Connectors: Enable Users to Create Custom Connectors Through UI',
    ],
    notes: 'Connector expansion (some connector epics are Later on the board).',
  },
  {
    deckFeature: 'Workflows as Tools & AI Agents as Steps',
    deckBucket: 'now',
    githubEpicKeys: [
      '[Epic] Introduce AI Agents as Steps within Workflows (Agentic Workflows) ',
      '[Epic] Workflows as Runtime for Agent Builder',
      'Agents as steps in workflow',
    ],
  },
  {
    deckFeature: 'Event-Driven Triggers',
    deckBucket: 'next',
    githubEpicKeys: ['[Epic] Event-Driven Triggers GA'],
    notes: 'Also in Now on GitHub — deck shows Next for follow-on platform triggers.',
  },
  {
    deckFeature: 'Workflow Composition',
    deckBucket: 'next',
    githubEpicKeys: ['[Epic] Lifecycle Hooks', 'Agents as steps in workflow'],
  },
  {
    deckFeature: 'Execution Safety',
    deckBucket: 'next',
    githubEpicKeys: ['[Epic] Queue Concurrency Strategy for Workflow Executions '],
  },
  {
    deckFeature: 'AI Steps',
    deckBucket: 'next',
    githubEpicKeys: [
      '[Epic] AI Editor Experience (type ahead / predictive YAML generation) ',
      '[Epic] Natural Language Authoring GA',
    ],
  },
  {
    deckFeature: 'Data Transformation',
    deckBucket: 'next',
    githubEpicKeys: [
      '[One Workflow] Support Cross Project Search (CPS) in Elasticsearch steps',
    ],
  },
  {
    deckFeature: 'Expand Connector Library',
    deckBucket: 'next',
    githubEpicKeys: [
      'Connectors: Ship Connector Updates Independent of Stack Releases',
      '[Epic] AWS Service Connectors for Workflows',
    ],
  },
  {
    deckFeature: 'Workflow Debugging',
    deckBucket: 'next',
    githubEpicKeys: ['[Epic] Configurable Workflow Execution Identity'],
    notes: 'No 1:1 epic title on the board; closest execution/debug identity work.',
  },
  {
    deckFeature: 'Workflow Versioning',
    deckBucket: 'next',
    githubEpicKeys: ['[Epic] Workflow Versioning'],
    notes: 'Now on GitHub board.',
  },
  {
    deckFeature: 'Human-in-the-Loop (HIL) Support',
    deckBucket: 'next',
    githubEpicKeys: ['[Epic] Human-in-the-Loop GA', '[Epic] Human-in-the-Loop — Tech Preview'],
  },
  {
    deckFeature: 'Workflow Library',
    deckBucket: 'next',
    githubEpicKeys: ['[Epic] Workflow Template Library'],
  },
  {
    deckFeature: 'System Workflows',
    deckBucket: 'later',
    githubEpicKeys: ['[Epic] System Workflows'],
    notes: 'Now on GitHub board — deck horizon is Later.',
  },
  {
    deckFeature: 'Workflows-as-Code',
    deckBucket: 'later',
    githubEpicKeys: ['[Epic] Workflow Authoring Beyond Kibana'],
  },
  {
    deckFeature: 'Workflow Recommendation',
    deckBucket: 'later',
    githubEpicKeys: [],
    notes: 'No matching epic row on project 705 yet.',
  },
  {
    deckFeature: 'Workflow Migration',
    deckBucket: 'later',
    githubEpicKeys: [],
    notes: 'No matching epic row on project 705 yet.',
  },
  {
    deckFeature: 'Visual Workflow Builder & NL Authoring',
    deckBucket: 'later',
    githubEpicKeys: [
      '[Epic] Enable Visual Workflow Builder',
      '[Epic] Natural Language Authoring GA',
    ],
  },
  {
    deckFeature: 'Execution View & Analytics',
    deckBucket: 'later',
    githubEpicKeys: [
      '[Epic] Workflow Execution View',
      '[Epic] OOTB Workflow Execution Dashboard',
      'Workflow Execution Status Panel in Discover',
    ],
  },
];

const normalizeEpicKey = (epicKey: string): string => epicKey.trim();

const correlatedEpicKeySet = new Set<string>(
  WORKFLOWS_DECK_EPIC_CORRELATIONS.flatMap((entry) => entry.githubEpicKeys.map(normalizeEpicKey))
);

/** Additional project-705 epic keys that belong to One Workflow but are not named on the deck. */
export const WORKFLOWS_SUPPLEMENTAL_GITHUB_EPIC_KEYS: readonly string[] = [
  '[Epic] Self-Managed Workflow Execution Metering',
  '[Epic] [One Workflow] Workflows 9.4 GA Documentation',
  '[Epic] Human-in-the-Loop GA',
  'Improved empty state for Accelerated onboarding.',
];

for (const key of WORKFLOWS_SUPPLEMENTAL_GITHUB_EPIC_KEYS) {
  correlatedEpicKeySet.add(normalizeEpicKey(key));
}

export const getDeckFeatureForGithubEpicKey = (
  epicKey: string
): WorkflowsDeckEpicCorrelation | undefined => {
  const normalized = normalizeEpicKey(epicKey);
  return WORKFLOWS_DECK_EPIC_CORRELATIONS.find((entry) =>
    entry.githubEpicKeys.some((key) => normalizeEpicKey(key) === normalized)
  );
};

export const isWorkflowsGithubEpicKey = ({
  epicKey,
  projectNumber,
}: {
  epicKey: string;
  projectNumber?: number;
}): boolean => {
  const normalized = normalizeEpicKey(epicKey);
  if (correlatedEpicKeySet.has(normalized)) {
    return true;
  }

  if (projectNumber !== undefined && projectNumber !== WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER) {
    return false;
  }

  if (normalized.startsWith('[One Workflow]')) {
    return true;
  }

  if (normalized.startsWith('[Epic]') && /workflow/i.test(normalized)) {
    return true;
  }

  if (/^Agents as steps in workflow$/i.test(normalized)) {
    return true;
  }

  if (/^Connectors:/i.test(normalized) && /workflow|connector/i.test(normalized)) {
    return true;
  }

  return false;
};

