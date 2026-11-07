/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { ExecutiveBrief } from './structured_insight';
import type { ExecutiveBriefAgentSnapshot } from './executive_brief_agents';
import type {
  BriefTopRisk,
  ExecutiveKpi,
  KillChainCoverage,
  RiskBandDatum,
  RiskTypeDatum,
} from './overview_metrics';
import { buildExecutiveBriefPrintDocument } from './executive_brief_pdf';

const brief: ExecutiveBrief = {
  narrative:
    'A coordinated credential-theft campaign is threading through the fleet toward the production Docker host.',
  drivers: [
    "'LSASS Memory Access' fired 13× (T1003.001) on jump-box-01, staging credential theft",
    "'Untrusted Container Image Deployed' hit docker-host-prod-01",
  ],
  businessImpact: 'Developer-to-cloud pivot risk if MACBOOK-DEV07 tokens reach production.',
  decisions: [
    'Isolate jump-box-01 and revoke a.rodriguez credentials',
    'Quarantine docker-host-prod-01 and audit its container image',
  ],
};

const kpis: ExecutiveKpi[] = [
  { id: 'postureScore', value: 49, format: 'score', delta: undefined },
  {
    id: 'materialRisk',
    value: 8,
    format: 'count',
    delta: { direction: 'up', value: 2, comparedTo: '7 days ago' },
  },
  { id: 'activeSignals', value: 8, format: 'count', delta: undefined },
  { id: 'tacticsObserved', value: 11, format: 'count', delta: undefined },
];

const riskBands: RiskBandDatum[] = [
  { level: 'Critical', count: 3, percentage: 37.5 },
  { level: 'High', count: 5, percentage: 62.5 },
];

const riskTypes: RiskTypeDatum[] = [
  { type: EntityType.host, count: 5, percentage: 62.5 },
  { type: EntityType.user, count: 3, percentage: 37.5 },
];

const killChain: KillChainCoverage = {
  steps: [
    {
      tacticId: 'TA0006',
      tacticName: 'Credential Access',
      alertCount: 13,
      topTechnique: { id: 'T1003.001', name: 'LSASS Memory', alertCount: 13 },
    },
    { tacticId: 'TA0008', tacticName: 'Lateral Movement', alertCount: 4, topTechnique: undefined },
  ],
  observedTacticCount: 2,
  totalTactics: 14,
  observedTechniqueCount: 5,
};

const topRisks: BriefTopRisk[] = [
  {
    id: 'host:1',
    name: 'docker-host-prod-01',
    type: EntityType.host,
    score: 78,
    level: 'High',
    criticality: 'high_impact',
  },
  {
    id: 'user:1',
    name: 'alex.chen',
    type: EntityType.user,
    score: 75,
    level: 'High',
    criticality: undefined,
  },
];

describe('buildExecutiveBriefPrintDocument', () => {
  const doc = buildExecutiveBriefPrintDocument({
    brief,
    kpis,
    riskBands,
    riskTypes,
    killChain,
    topRisks,
    generatedAtLabel: 'Generated 7/17/2026, 7:53 PM',
    connectorName: 'Anthropic Claude Opus 4.8',
  });

  it('produces a complete, non-blank HTML document with a body and styles', () => {
    // The blank-page regression manifested as an empty/unpopulated document;
    // assert the shell, a <body>, and real CSS are all present.
    expect(doc.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(doc).toContain('<body>');
    expect(doc).toContain('</body>');
    expect(doc).toContain('<style>');
    // Real layout rules must be present so the page is not a blank white sheet.
    expect(doc).toContain('.kpi-strip');
    expect(doc).toContain('.narrative');
  });

  it('embeds the assessment and decisions without rendering model-written drivers', () => {
    expect(doc).toContain('coordinated credential-theft campaign');
    expect(doc).not.toContain('LSASS Memory Access');
    expect(doc).not.toContain('Untrusted Container Image Deployed');
    expect(doc).toContain('Developer-to-cloud pivot risk');
    expect(doc).toContain('Isolate jump-box-01 and revoke a.rodriguez credentials');
    expect(doc).toContain('Quarantine docker-host-prod-01');
  });

  it('embeds the KPI strip values, risk mix, and top risks', () => {
    expect(doc).toContain('49');
    expect(doc).toContain('11');
    // Material-risk mix bands and counts.
    expect(doc).toContain('Critical');
    expect(doc).toContain('High');
    // Top risks by name.
    expect(doc).toContain('docker-host-prod-01');
    expect(doc).toContain('alex.chen');
  });

  it('embeds the richer kill-chain, risk-by-type, and top-risk criticality content', () => {
    // Kill-chain steps with tactic + top technique evidence.
    expect(doc).toContain('Credential Access');
    expect(doc).toContain('LSASS Memory');
    expect(doc).toContain('Lateral Movement');
    // Risk-by-type mix labels.
    expect(doc).toContain('Host');
    expect(doc).toContain('User');
    // Top-risk table renders mapped criticality (high_impact → "High").
    expect(doc).toContain('class="kc-tactic"');
    expect(doc).toContain('<table class="risk-table"');
  });

  it('embeds the generation timestamp and model provenance', () => {
    expect(doc).toContain('Generated 7/17/2026, 7:53 PM');
    expect(doc).toContain('Anthropic Claude Opus 4.8');
  });

  it('escapes HTML in grounded content so names cannot break the layout', () => {
    const withMarkup = buildExecutiveBriefPrintDocument({
      brief: { ...brief, narrative: 'Host <script>alert(1)</script> & "friends"' },
      kpis,
      riskBands,
      riskTypes,
      killChain,
      topRisks,
      generatedAtLabel: 'Generated now',
      connectorName: undefined,
    });

    expect(withMarkup).toContain('&lt;script&gt;');
    expect(withMarkup).not.toContain('<script>alert(1)</script>');
    expect(withMarkup).toContain('&amp;');
    expect(withMarkup).toContain('&quot;friends&quot;');
  });

  it('omits optional sections cleanly when they carry no content', () => {
    const minimal = buildExecutiveBriefPrintDocument({
      brief: { narrative: 'Terse story.', drivers: [], businessImpact: undefined, decisions: [] },
      kpis,
      riskBands: [],
      riskTypes: [],
      killChain: {
        steps: [],
        observedTacticCount: 0,
        totalTactics: 14,
        observedTechniqueCount: 0,
      },
      topRisks: [],
      generatedAtLabel: 'Generated now',
      connectorName: undefined,
    });

    // No impact/decisions headings when those fields are empty; model drivers are never printed.
    expect(minimal).not.toContain('What is driving this');
    expect(minimal).not.toContain('Business impact');
    expect(minimal).not.toContain('Decisions and next steps');
    // Empty kill-chain renders the grounded "no tactics" state, never fabricated steps.
    expect(minimal).not.toContain('class="kc-tactic"');
    expect(minimal).toContain('No MITRE tactics observed');
    // Still a complete, populated document with the narrative and empty-state text.
    expect(minimal).toContain('Terse story.');
    expect(minimal).toContain('<body>');
  });
});

const agents: ExecutiveBriefAgentSnapshot = {
  lookbackDays: 30,
  providers: [
    {
      provider: 'codex',
      name: 'Codex',
      status: 'available',
      identityCount: 1,
      sessions: 8,
      toolObservations: 600,
      failedToolObservations: 4,
      unknownToolOutcomes: 12,
      evaluatedSessions: 2,
      changedSessions: 1,
    },
    {
      provider: 'cursor',
      name: 'Cursor',
      status: 'available',
      identityCount: 1,
      sessions: 3,
      toolObservations: 120,
      failedToolObservations: 1,
      unknownToolOutcomes: 5,
      evaluatedSessions: 1,
      changedSessions: 1,
    },
    {
      provider: 'agent_builder',
      name: 'Agent Builder',
      status: 'available',
      identityCount: 4,
      invocations: 10,
      failedInvocations: 2,
    },
  ],
  totals: {
    agentIdentities: 6,
    externalSessions: 11,
    toolObservations: 720,
    failedToolObservations: 5,
    unknownToolOutcomes: 17,
    evaluatedSessions: 3,
    changedSessions: 2,
    builderInvocations: 10,
  },
  changedSessions: [
    {
      provider: 'cursor',
      agentId: 'cursor-installation',
      sessionId: 'cursor-session',
      routeKey: '["cursor-installation","cursor-session"]',
      title: 'Production rollout review',
      lastSeen: '2026-10-12T12:00:00Z',
      source: { index: 'logs-cursor.entity_intelligence-default', id: 'summary-doc' },
      findings: [
        {
          kind: 'new_tool',
          toolName: 'run_terminal_command',
          observed: 2,
          baseline: 0,
          threshold: 1,
          baselineSampleSize: 5,
        },
      ],
    },
  ],
  builderAgents: [
    {
      agentId: 'soc-agent',
      name: 'SOC reviewer',
      invocations: 10,
      failedInvocations: 2,
      configuredTools: 4,
      configuredConnectors: 1,
      creatorRecorded: true,
    },
  ],
  limitations: [
    'cumulative_observations',
    'agent_builder_baseline',
    'local_owner_not_caller',
    'unknown_outcomes',
  ],
};

const snapshotPayload = {
  brief,
  kpis,
  riskBands,
  riskTypes,
  killChain,
  topRisks,
  agents,
  generatedAtLabel: 'Assessment generated 12:05',
  capturedAtLabel: 'Snapshot captured 12:00',
  connectorName: 'Model connector',
  coverage: {
    entityStore: 'available',
    entities: 'available',
    detections: 'available',
    anomalies: 'available',
    huntingLeads: 'disabled',
  } as const,
};

describe('executive brief agent evidence export', () => {
  it('excludes model-written associations while retaining independently supplied source facts', () => {
    const fabricatedAssociation = 'Cursor Production rollout review was requested by a.rodriguez';
    const html = buildExecutiveBriefPrintDocument({
      ...snapshotPayload,
      brief: { ...brief, drivers: [fabricatedAssociation] },
    });
    expect(html).not.toContain(fabricatedAssociation);
    expect(html).not.toContain('What is driving this');
    expect(html).toContain('Production rollout review');
    expect(html).toContain(
      'run_terminal_command: 2 observations; absent from 5 comparable prior sessions.'
    );
    expect(html).toContain('docker-host-prod-01');
  });

  it('keeps external sessions, cumulative observations, and Agent Builder invocations distinct', () => {
    const document = new DOMParser().parseFromString(
      buildExecutiveBriefPrintDocument(snapshotPayload),
      'text/html'
    );
    const providerCards = document.querySelectorAll('.provider');
    expect(providerCards).toHaveLength(3);
    expect(providerCards[0].textContent).toContain('Codex');
    expect(providerCards[0].textContent).toContain('600Accumulated tool observations');
    expect(providerCards[1].textContent).toContain('Cursor');
    expect(providerCards[1].textContent).toContain('3Sessions');
    expect(providerCards[1].textContent).not.toContain('MCP connections');
    expect(providerCards[2].textContent).toContain('Agent Builder');
    expect(providerCards[2].textContent).toContain('10Agent invocations');
    expect(providerCards[2].textContent).not.toContain('Sessions');
    expect(document.body.textContent).toContain('4 configured tools');
    expect(document.body.textContent).toContain('cumulative snapshots');
  });

  it('prints measured findings, source coverage and attribution limits from the supplied snapshot', () => {
    const html = buildExecutiveBriefPrintDocument(snapshotPayload);
    expect(html).toContain('Production rollout review');
    expect(html).toContain(
      'run_terminal_command: 2 observations; absent from 5 comparable prior sessions.'
    );
    expect(html).toContain('Session: cursor-session');
    expect(html).toContain('Hunting leads');
    expect(html).toContain('Disabled');
    expect(html).toContain('does not establish the authenticated person');
    expect(html).toContain('Unknown');
    expect(html).toContain('Snapshot captured 12:00');
    expect(html).toContain('Assessment generated 12:05');
    expect(html).toContain('Later dashboard updates are not included.');
  });

  it('exports factual evidence without synthesizing a narrative or claiming connector generation', () => {
    const html = buildExecutiveBriefPrintDocument({ ...snapshotPayload, brief: undefined });
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('.report-kind')?.textContent).toBe('Evidence snapshot');
    expect(document.querySelector('.narrative')).toBeNull();
    expect(document.querySelector('.decisions')).toBeNull();
    expect(html).not.toContain('Generated by Model connector');
    expect(html).toContain('AI agent activity and behavior');
    expect(html).toContain('Production rollout review');
  });

  it('does not render missing provider counts as zero or missing evidence as an all-clear', () => {
    const html = buildExecutiveBriefPrintDocument({
      ...snapshotPayload,
      riskBands: [],
      riskTypes: [],
      topRisks: [],
      killChain: { ...killChain, steps: [] },
      coverage: {
        entityStore: 'unavailable',
        entities: 'unavailable',
        detections: 'unavailable',
        anomalies: 'unavailable',
        huntingLeads: 'loading',
      },
      agents: {
        ...agents,
        providers: [{ provider: 'cursor', name: 'Cursor', status: 'unavailable' }],
        totals: {},
        changedSessions: [],
        builderAgents: [],
        limitations: ['source_unavailable', 'limited_baseline'],
      },
    });
    const document = new DOMParser().parseFromString(html, 'text/html');
    const card = document.querySelector('.provider');
    expect(card?.textContent).toContain('Unavailable');
    expect(card?.textContent).toContain('—Sessions');
    expect(card?.textContent).not.toContain('0Sessions');
    expect(html).toContain('Evidence unavailable in this snapshot.');
    expect(html).not.toContain('No material-risk entities');
    expect(html).not.toContain('No MITRE tactics observed');
    expect(html).toContain('Combined totals are withheld');
    expect(html).toContain('No finding does not establish normal behavior');
  });

  it('escapes untrusted provider names, session titles, tool names, and export provenance', () => {
    const unsafe = '<img src=x onerror="alert(1)">';
    const session = agents.changedSessions[0];
    const html = buildExecutiveBriefPrintDocument({
      ...snapshotPayload,
      generatedAtLabel: unsafe,
      capturedAtLabel: unsafe,
      connectorName: unsafe,
      agents: {
        ...agents,
        providers: agents.providers.map((provider) => ({ ...provider, name: unsafe })),
        builderAgents: agents.builderAgents.map((agent) => ({ ...agent, name: unsafe })),
        changedSessions: [
          {
            ...session,
            title: unsafe,
            sessionId: unsafe,
            findings: session.findings.map((finding) => ({ ...finding, toolName: unsafe })),
          },
        ],
      },
    });
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
    expect(document.body.textContent).toContain(unsafe);
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('retains observed rows for partial sources while withholding complete headline totals', () => {
    const html = buildExecutiveBriefPrintDocument({
      ...snapshotPayload,
      coverage: {
        entityStore: 'partial',
        entities: 'partial',
        detections: 'partial',
        anomalies: 'partial',
        huntingLeads: 'available',
      },
    });
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(
      [...document.querySelectorAll('.kpi-value')].map((element) => element.textContent)
    ).toEqual(['—', '—', '—', '—']);
    expect(document.querySelector('.risk-table')?.textContent).toContain('docker-host-prod-01');
    expect(document.querySelector('.killchain')?.textContent).toContain('Credential Access');
    expect(document.querySelector('.bar-count')?.textContent).toBe('3');
    expect(html).toContain('Partial evidence. Displayed figures describe the loaded sample.');
    expect(document.querySelector('.coverage')?.textContent).toContain('Partial evidence');

    const emptyPartial = buildExecutiveBriefPrintDocument({
      ...snapshotPayload,
      riskBands: [],
      riskTypes: [],
      topRisks: [],
      killChain: { ...killChain, steps: [] },
      coverage: {
        entityStore: 'partial',
        entities: 'partial',
        detections: 'partial',
        anomalies: 'partial',
        huntingLeads: 'available',
      },
    });
    expect(emptyPartial).toContain('Evidence is incomplete in this snapshot');
    expect(emptyPartial).not.toContain('No material-risk entities');
    expect(emptyPartial).not.toContain('No MITRE tactics observed');
  });

  it.each([0, undefined])(
    'withholds the changed-session aggregate for %s comparable sessions while retaining bounded findings',
    (evaluatedSessions) => {
      const html = buildExecutiveBriefPrintDocument({
        ...snapshotPayload,
        agents: { ...agents, totals: { ...agents.totals, evaluatedSessions } },
      });
      const document = new DOMParser().parseFromString(html, 'text/html');
      expect(document.querySelectorAll('.agent-totals .agent-metric')[2].textContent).toBe(
        '—Sessions with behavior changes'
      );
      expect(html).toContain('Sessions with changes: —');
      expect(html).toContain(
        evaluatedSessions === 0 ? 'Needs more baseline data' : 'Incomplete evidence'
      );
      expect(document.querySelector('.behavior-finding')?.textContent).toContain(
        'Production rollout review'
      );
    }
  );

  it('uses proportional risk bars without inflating small or empty bands', () => {
    const html = buildExecutiveBriefPrintDocument({
      ...snapshotPayload,
      riskBands: [
        { level: 'High', count: 0, percentage: 0 },
        { level: 'Critical', count: 1, percentage: 1 },
      ],
    });
    expect(html).toContain('width:0%');
    expect(html).toContain('width:1%');
  });
});
