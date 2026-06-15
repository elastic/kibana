/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_WORKFLOWS_ROADMAP } from './roadmap_mapping';
import {
  WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
  type WorkflowsDeckBucket,
} from './workflows_deck_epic_correlation';
import { buildEpicPhaseDocument, buildEpicPhaseDocumentId } from '../lib/build_epic_phases';

export const WORKFLOWS_EXECUTIVE_DEMO_SEED_TAG = 'workflows_executive_demo_v1';

export interface WorkflowsExecutiveDemoEpicSeed {
  readonly displayId: string;
  readonly deckFeature: string;
  readonly title: string;
  readonly summary: string;
  readonly deckBucket: WorkflowsDeckBucket;
  readonly releaseMilestone: string;
  readonly productTags: readonly string[];
}

/** Deck-style epics for the executive Workflows roadmap (local demo / design parity). */
export const WORKFLOWS_EXECUTIVE_DEMO_EPICS: readonly WorkflowsExecutiveDemoEpicSeed[] = [
  {
    displayId: 'WF-001',
    deckFeature: 'Workflow Engine',
    title: 'Workflow Engine',
    summary: 'Core workflow execution runtime, state machine, and error handling for Kibana.',
    deckBucket: 'released_9_3',
    releaseMilestone: '9.3',
    productTags: ['Workflows'],
  },
  {
    displayId: 'WF-002',
    deckFeature: 'Workflow Authoring',
    title: 'Workflow Authoring (YAML)',
    summary: 'Author, validate, and publish workflow definitions as YAML with guardrails.',
    deckBucket: 'released_9_3',
    releaseMilestone: '9.3',
    productTags: ['Workflows'],
  },
  {
    displayId: 'WF-003',
    deckFeature: 'Workflow Management',
    title: 'Workflow Management',
    summary: 'Lifecycle management, visualization, and operational controls for workflows.',
    deckBucket: 'released_9_3',
    releaseMilestone: '9.3',
    productTags: ['Workflows', 'Alerting'],
  },
  {
    displayId: 'WF-004',
    deckFeature: 'Core Workflow Triggers',
    title: 'Core Workflow Triggers',
    summary: 'Event-driven and scheduled triggers to start workflow executions.',
    deckBucket: 'released_9_3',
    releaseMilestone: '9.3',
    productTags: ['Workflows'],
  },
  {
    displayId: 'WF-005',
    deckFeature: 'Core Workflow Steps',
    title: 'Core Workflow Steps',
    summary: 'Built-in steps for flow control, lifecycle hooks, and internal actions.',
    deckBucket: 'released_9_3',
    releaseMilestone: '9.3',
    productTags: ['Workflows'],
  },
  {
    displayId: 'WF-006',
    deckFeature: 'External Action Steps',
    title: 'External Action Steps',
    summary: 'Connectors and external integrations invoked as workflow steps.',
    deckBucket: 'released_9_3',
    releaseMilestone: '9.3',
    productTags: ['Workflows'],
  },
  {
    displayId: 'WF-007',
    deckFeature: 'Workflows as Tools & AI Agents as Steps',
    title: 'Workflows as Tools & AI Agents as Steps',
    summary: 'Agent Builder and AI agent steps embedded in workflow execution.',
    deckBucket: 'now',
    releaseMilestone: '9.4',
    productTags: ['Workflows'],
  },
] as const;

const buildDemoTickets = (displayId: string) => [
  {
    repo: 'elastic/kibana',
    items: [
      {
        issueRef: `#KBN-${displayId.replace('WF-', '')}-001`,
        number: 20101,
        title: `${displayId} delivery ticket — core implementation`,
        status: 'closed',
        prRefs: ['#PR-20101'],
      },
      {
        issueRef: `#KBN-${displayId.replace('WF-', '')}-002`,
        number: 20102,
        title: `${displayId} delivery ticket — hardening & docs`,
        status: 'closed',
        prRefs: ['#PR-20102'],
      },
    ],
  },
];

export const buildWorkflowsExecutiveDemoDocuments = (): Array<{ id: string; doc: Record<string, unknown> }> => {
  const timestamp = new Date().toISOString();
  const roadmap = {
    ...ELASTIC_WORKFLOWS_ROADMAP,
    title: 'Elastic Workflows & Automation',
  };

  return WORKFLOWS_EXECUTIVE_DEMO_EPICS.map((seed) => {
    const epicKey = `[Demo] ${seed.deckFeature}`;
    const base = buildEpicPhaseDocument({
      epicKey,
      displayId: seed.displayId,
      title: seed.title,
      summary: seed.summary,
      owner: 'Workflows Team',
      projectItemId: `demo-${seed.displayId.toLowerCase()}`,
      projectNumber: WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER,
      fields: {
        Team: 'One Workflow',
        Epic: epicKey,
        Status: 'Done',
        'Product Initiative': seed.deckFeature,
        'Release Milestone': seed.releaseMilestone,
        'Product Roadmap Stage': '✅ Shipped',
      },
      epicLabels: ['Team:One Workflow'],
      links: {
        project_url: `https://github.com/orgs/elastic/projects/${WORKFLOWS_ROADMAP_GITHUB_PROJECT_NUMBER}/views/134`,
        prd_url: `https://docs.elastic.dev/workflows/${seed.displayId.toLowerCase()}/prd`,
        arch_url: `https://docs.elastic.dev/workflows/${seed.displayId.toLowerCase()}/architecture`,
      },
      childIssues: [
        { state: 'CLOSED', labels: ['Team:One Workflow'], projectStatus: 'Done' },
        { state: 'CLOSED', labels: ['Team:One Workflow'], projectStatus: 'Done' },
      ],
      childPullRequests: [
        { merged: true, state: 'MERGED' },
        { merged: true, state: 'MERGED' },
      ],
      ticketsByRepo: buildDemoTickets(seed.displayId),
    });

    const doc: Record<string, unknown> = {
      ...base,
      '@timestamp': timestamp,
      roadmap,
      release: {
        milestone: seed.releaseMilestone,
        roadmap_stage: '✅ Shipped',
        initiative: seed.deckFeature,
        deck_feature: seed.deckFeature,
        deck_bucket: seed.deckBucket,
      },
      epic: {
        ...(base.epic as Record<string, unknown>),
        teams: ['One Workflow', ...seed.productTags],
      },
      teams: {
        own_org_team: 'siem',
        own_engineering_team: 'One Workflow',
        contributing_org_teams: ['siem'],
        contributing_engineering_teams: ['One Workflow', ...seed.productTags],
        cross_team: false,
        team_count: 1,
      },
      rollup: {
        coverage_pct: 100,
        delivery_coverage_pct: 100,
        gates_passed_pct: 100,
        gates_applicable: 2,
        gates_passed: 2,
        status: 'closed',
      },
      phases: {
        ...(base.phases as Record<string, unknown>),
        p4_tickets: {
          gate: 'pass',
          total: 2,
          done: 2,
          open: 0,
          in_progress: 0,
          done_pct: 100,
        },
        p5_prs: {
          gate: 'pass',
          total: 2,
          merged: 2,
          open: 0,
          merged_pct: 100,
        },
      },
      metadata: {
        seed: WORKFLOWS_EXECUTIVE_DEMO_SEED_TAG,
        demo: true,
      },
    };

    return {
      id: buildEpicPhaseDocumentId({ roadmapId: roadmap.id, epicKey }),
      doc,
    };
  });
};
