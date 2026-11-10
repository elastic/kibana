/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds Nightshift investigations for local development. Run from the repo root:
 *
 *   node -r @kbn/setup-node-env x-pack/solutions/observability/plugins/nightshift/scripts/seed_nightshift_investigations.ts
 *
 * Add --help to list the connection flags, --clean to only remove earlier seeds.
 *
 * Each scenario is written as a shared agentic investigation, the way a real run leaves it:
 *
 * - An Agent Builder conversation on the `investigation` template, run by the
 *   `nightshift.investigation` agent, public, owned by the --auth user, with its title and the
 *   `status` / `severity` / `summary` / `verdict` metadata. Its id is derived from the scenario,
 *   so a re-run replaces the same investigations.
 * - Its subject, impact, and hypotheses documents in the agentic investigations side indexes,
 *   each attached to the conversation by reference (hidden, `origin` = document id).
 * - Its proposed actions, created by the proposals gate workflow that `proposals.create` runs.
 * - For one scenario, an impact map, written through the impact map route as the
 *   `set_impact_map` tool writes it, which also fills the space's impact map catalog.
 *
 * Kibana HTTP APIs do the writes wherever a route exists. The side-index documents and the
 * conversation timestamps have none, so they are written straight to Elasticsearch as the
 * kibana_system user. No AI connector or investigation workflow run is needed.
 */

import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { types } from '@kbn/storage-adapter';
import type { StorageSchema } from '@kbn/storage-adapter';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  HYPOTHESES_ATTACHMENT_TYPE,
  HYPOTHESES_INDEX_NAME,
  IMPACT_ATTACHMENT_TYPE,
  IMPACT_INDEX_NAME,
  IMPACT_MAP_INDEX_NAME,
  INVESTIGATION_IMPACT_MAP_URL,
  INVESTIGATION_STATUS_URL,
  INVESTIGATION_TEMPLATE_ID,
  INVESTIGATIONS_INTERNAL_URL,
  SUBJECT_ATTACHMENT_TYPE,
  SUBJECT_INDEX_NAME,
} from '@kbn/agentic-investigations-plugin/common';
import type {
  AlertSubjectSnapshot,
  EvidenceChart,
  EvidenceChartAnnotation,
  EvidenceChartSeries,
  Hypothesis,
  Impact,
  ImpactEntity,
  ImpactMapEntity,
  ImpactMapEntityType,
  ImpactMapRelationship,
  ImpactMapRelationshipType,
  InvestigationEvidence,
  InvestigationHypotheses,
  InvestigationMetadataStatus,
  InvestigationSeverity,
  InvestigationSubject,
  InvestigationSubjectInput,
  InvestigationSubjectTriggerType,
  ListInvestigationsResponse,
  User,
} from '@kbn/agentic-investigations-plugin/common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import {
  PROPOSALS_API_VERSION,
  PROPOSALS_INDEX_NAME,
  PROPOSALS_INTERNAL_URL,
} from '@kbn/proposals-common';
import type { ListProposalsResponse, ProposalConfidence } from '@kbn/proposals-common';

/** Namespace of the seeded conversation ids: `uuidv5(<scenario subject id>, SEED_ID_NAMESPACE)`. */
const SEED_ID_NAMESPACE = '6f1d8f5e-2b8c-4c55-9a51-6b3f4c1e9d20';

/** Space the investigations are seeded in. */
const SPACE_ID = 'default';

/** The proposals gate workflow (`CREATE_PROPOSAL_WORKFLOW_ID` in `@kbn/workflows/managed`). */
const CREATE_PROPOSAL_WORKFLOW_ID = 'system-create-proposal';

/** Workflow execution statuses that end a run (`TerminalExecutionStatuses` in `@kbn/workflows`). */
const TERMINAL_EXECUTION_STATUSES = ['completed', 'failed', 'cancelled', 'skipped', 'timed_out'];

/** Attachment type of a proposal card (`PROPOSAL_ATTACHMENT_TYPE` in `@kbn/proposals-common`). */
const PROPOSAL_ATTACHMENT_TYPE = 'platform.proposal';

/** Agent Builder's conversation index (`chatSystemIndex('conversations')` in `@kbn/agent-builder-server`). */
const CONVERSATIONS_INDEX = '.chat-conversations';

/** Agent Builder public API version. */
const PUBLIC_API_VERSION = '2023-10-31';

type ChartUnit = NonNullable<EvidenceChart['y_axis']['unit']>;
type SeedSubject = Omit<InvestigationSubjectInput, 'triggerType'>;
type SeedImpact = Pick<Impact, 'summary' | 'evidence' | 'entities'>;

/** A proposed action, created like `proposals.create` creates one (`origin: nightshift`). */
interface SeedProposal {
  title: string;
  comment: string;
  confidence: ProposalConfidence;
}

/** The body of the impact map route, as the `set_impact_map` tool takes it. */
interface SeedImpactMap {
  title: string;
  entities: ImpactMapEntity[];
  relationships: ImpactMapRelationship[];
  entity_types: ImpactMapEntityType[];
  relationship_types: ImpactMapRelationshipType[];
}

interface Scenario {
  title: string;
  status: InvestigationMetadataStatus;
  severity?: InvestigationSeverity;
  /** What happened (`metadata.summary`). */
  summary?: string;
  /** The conclusion (`metadata.verdict`). */
  verdict?: string;
  subject: SeedSubject;
  triggerType: InvestigationSubjectTriggerType;
  hypotheses?: Hypothesis[];
  impact?: SeedImpact;
  impactMap?: SeedImpactMap;
  proposals: SeedProposal[];
  createdMinutesAgo: number;
  updatedMinutesAgo: number;
}

/**
 * Customer 0 Code Intelligence path, shaped from the local `customer-0` Elasticsearch
 * connector (services `kibana-frontend`, `kibana`, `customer-zero-codebox`,
 * `customer-zero-code-indexer`) and the `elastic-read-all` GitHub connector
 * (`elastic/codebox`, `elastic/code-intelligence-indexer`, `elastic/sourcerer`,
 * `elastic/code-intelligence`). Indexer jobs fail when Sourcerer runs while the
 * OTel collector is refusing large metric batches under memory pressure.
 */
const CHECKOUT_IMPACT_MAP: SeedImpactMap = {
  title: 'Code Intelligence index lag from OTel collector memory pressure',
  entity_types: [
    {
      id: 'nodejs_service',
      label: 'Node.js service',
      kind: 'service',
      icon: { agent_name: 'nodejs' },
    },
    {
      id: 'python_service',
      label: 'Python service',
      kind: 'service',
      icon: { agent_name: 'python' },
    },
    {
      id: 'group',
      label: 'Group',
      kind: 'infrastructure',
      icon: { eui_icon: 'nested' },
    },
    {
      id: 'cloud.service',
      label: 'Cloud service',
      kind: 'infrastructure',
      icon: { eui_icon: 'productCloudInfra' },
    },
    {
      id: 'repository',
      label: 'Repository',
      kind: 'infrastructure',
      icon: { eui_icon: 'branch' },
    },
    {
      id: 'team',
      label: 'Team',
      kind: 'infrastructure',
      icon: { eui_icon: 'users' },
    },
    {
      id: 'environment',
      label: 'Environment',
      kind: 'infrastructure',
      icon: { eui_icon: 'globe' },
    },
    {
      id: 'host',
      label: 'Host',
      kind: 'infrastructure',
      icon: { eui_icon: 'storage' },
    },
  ],
  relationship_types: [
    { id: 'calls', label: 'calls' },
    { id: 'depends_on', label: 'depends on' },
    { id: 'reads_from', label: 'reads from' },
    { id: 'writes_to', label: 'writes to' },
    { id: 'owned_by', label: 'owned by' },
    { id: 'managed_by', label: 'managed by' },
    { id: 'deployed_by', label: 'deployed by' },
    { id: 'runs_on', label: 'runs on' },
  ],
  entities: [
    {
      id: 'env-gcp',
      type_id: 'environment',
      label: 'gcp',
      source: 'log',
      confidence: 'high',
      annotations: { role: 'context', health: 'degraded', impacted: true },
    },
    {
      id: 'ui-group',
      parent_id: 'env-gcp',
      type_id: 'group',
      label: 'Nightshift UI',
      source: 'catalog',
      confidence: 'high',
      annotations: { role: 'symptom', health: 'degraded', impacted: true },
    },
    {
      id: 'pipeline-group',
      parent_id: 'env-gcp',
      type_id: 'group',
      label: 'Code Intelligence pipeline',
      source: 'diagram',
      confidence: 'high',
      annotations: { role: 'contributor', health: 'degraded', impacted: true },
    },
    {
      id: 'otel-group',
      parent_id: 'env-gcp',
      type_id: 'group',
      label: 'Observability intake',
      source: 'log',
      confidence: 'high',
      annotations: { role: 'context', health: 'critical', impacted: true },
    },
    {
      id: 'sources-group',
      parent_id: 'env-gcp',
      type_id: 'group',
      label: 'GitHub sources',
      source: 'code',
      confidence: 'high',
      annotations: { role: 'context', health: 'healthy' },
    },
    {
      id: 'kibana-frontend',
      parent_id: 'ui-group',
      type_id: 'nodejs_service',
      label: 'kibana-frontend',
      source: 'trace',
      confidence: 'high',
      annotations: { role: 'symptom', health: 'degraded', impacted: true, alert_count: 2 },
    },
    {
      id: 'kibana',
      parent_id: 'ui-group',
      type_id: 'nodejs_service',
      label: 'kibana',
      source: 'log',
      confidence: 'high',
      annotations: { role: 'symptom', health: 'degraded', impacted: true },
    },
    {
      id: 'customer-zero-codebox',
      parent_id: 'pipeline-group',
      type_id: 'nodejs_service',
      label: 'customer-zero-codebox',
      source: 'log',
      confidence: 'high',
      annotations: { role: 'contributor', health: 'degraded', impacted: true },
    },
    {
      id: 'customer-zero-code-indexer',
      parent_id: 'pipeline-group',
      type_id: 'python_service',
      label: 'customer-zero-code-indexer',
      source: 'log',
      confidence: 'high',
      annotations: { role: 'contributor', health: 'critical', impacted: true, alert_count: 1 },
    },
    {
      id: 'sourcerer',
      parent_id: 'pipeline-group',
      type_id: 'python_service',
      label: 'sourcerer',
      source: 'log',
      confidence: 'high',
      annotations: { role: 'contributor', health: 'critical', impacted: true },
    },
    {
      id: 'otel-collector',
      parent_id: 'otel-group',
      type_id: 'cloud.service',
      label: 'otel-collector',
      source: 'log',
      confidence: 'high',
      annotations: { role: 'root_cause', health: 'critical', impacted: true },
    },
    {
      id: 'indexer-host',
      parent_id: 'otel-group',
      type_id: 'host',
      label: 'a14b825a66c3',
      source: 'metric',
      confidence: 'medium',
      annotations: { role: 'context', health: 'degraded', impacted: true },
    },
    {
      id: 'repo-codebox',
      parent_id: 'sources-group',
      type_id: 'repository',
      label: 'elastic/codebox',
      source: 'code',
      confidence: 'high',
      annotations: { role: 'context', health: 'healthy' },
    },
    {
      id: 'repo-indexer',
      parent_id: 'sources-group',
      type_id: 'repository',
      label: 'elastic/code-intelligence-indexer',
      source: 'code',
      confidence: 'high',
      annotations: { role: 'context', health: 'healthy' },
    },
    {
      id: 'repo-sourcerer',
      parent_id: 'sources-group',
      type_id: 'repository',
      label: 'elastic/sourcerer',
      source: 'code',
      confidence: 'high',
      annotations: { role: 'context', health: 'healthy' },
    },
    {
      id: 'repo-code-intelligence',
      parent_id: 'sources-group',
      type_id: 'repository',
      label: 'elastic/code-intelligence',
      source: 'code',
      confidence: 'high',
      annotations: { role: 'context', health: 'healthy' },
    },
    {
      id: 'team-nightshift',
      type_id: 'team',
      label: 'Nightshift',
      source: 'catalog',
      confidence: 'medium',
      annotations: { role: 'context', health: 'healthy' },
    },
  ],
  relationships: [
    {
      type_id: 'calls',
      source_id: 'kibana-frontend',
      target_id: 'kibana',
      on_critical_path: true,
      source: 'trace',
      confidence: 'high',
      label: 'Code Intelligence UI',
    },
    {
      type_id: 'calls',
      source_id: 'kibana',
      target_id: 'customer-zero-codebox',
      on_critical_path: true,
      source: 'log',
      confidence: 'high',
      label: 'repo fetch',
    },
    {
      type_id: 'calls',
      source_id: 'customer-zero-codebox',
      target_id: 'customer-zero-code-indexer',
      on_critical_path: true,
      source: 'log',
      confidence: 'high',
      label: 'queue index job',
    },
    {
      type_id: 'calls',
      source_id: 'customer-zero-code-indexer',
      target_id: 'sourcerer',
      on_critical_path: true,
      source: 'log',
      confidence: 'high',
      label: 'sourcerer.started',
    },
    {
      type_id: 'writes_to',
      source_id: 'customer-zero-code-indexer',
      target_id: 'otel-collector',
      on_critical_path: true,
      source: 'log',
      confidence: 'high',
      label: 'OTLP metrics export',
    },
    {
      type_id: 'writes_to',
      source_id: 'sourcerer',
      target_id: 'otel-collector',
      source: 'log',
      confidence: 'medium',
      label: 'OTLP spans/logs',
    },
    {
      type_id: 'runs_on',
      source_id: 'customer-zero-code-indexer',
      target_id: 'indexer-host',
      source: 'metric',
      confidence: 'medium',
    },
    {
      type_id: 'reads_from',
      source_id: 'customer-zero-codebox',
      target_id: 'repo-codebox',
      source: 'code',
      confidence: 'high',
    },
    {
      type_id: 'deployed_by',
      source_id: 'customer-zero-code-indexer',
      target_id: 'repo-indexer',
      source: 'code',
      confidence: 'high',
    },
    {
      type_id: 'deployed_by',
      source_id: 'sourcerer',
      target_id: 'repo-sourcerer',
      source: 'code',
      confidence: 'high',
    },
    {
      type_id: 'depends_on',
      source_id: 'kibana',
      target_id: 'repo-code-intelligence',
      source: 'inferred',
      confidence: 'low',
      label: 'plugin surface',
    },
    {
      type_id: 'owned_by',
      source_id: 'pipeline-group',
      target_id: 'team-nightshift',
      source: 'catalog',
      confidence: 'medium',
    },
    {
      type_id: 'owned_by',
      source_id: 'ui-group',
      target_id: 'team-nightshift',
      source: 'catalog',
      confidence: 'medium',
    },
    {
      type_id: 'depends_on',
      source_id: 'otel-collector',
      target_id: 'indexer-host',
      source: 'inferred',
      confidence: 'low',
      label: 'shared memory pressure',
    },
  ],
};

const now = Date.now();
const iso = (minutesAgo: number): string =>
  new Date(now - minutesAgo * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');

const GIB = 1024 ** 3;

/** A time series whose last point is `endMinutesAgo` minutes ago, one point every `stepMinutes`. */
const timeSeries = (
  name: string,
  endMinutesAgo: number,
  values: number[],
  stepMinutes = 5
): EvidenceChartSeries => ({
  name,
  points: values.map((y, index) => ({
    x: iso(endMinutesAgo + (values.length - 1 - index) * stepMinutes),
    y,
  })),
});

/** A point annotation, or a range annotation when `endMinutesAgo` is set. */
const annotation = (
  minutesAgo: number,
  label: string,
  endMinutesAgo?: number
): EvidenceChartAnnotation => ({
  x: iso(minutesAgo),
  ...(endMinutesAgo !== undefined && { x_end: iso(endMinutesAgo) }),
  label,
});

const timeChart = ({
  title,
  type = 'line',
  yLabel,
  unit,
  stacked,
  series,
  annotations,
}: {
  title: string;
  type?: EvidenceChart['type'];
  yLabel: string;
  unit?: ChartUnit;
  stacked?: boolean;
  series: EvidenceChartSeries[];
  annotations?: EvidenceChartAnnotation[];
}): EvidenceChart => ({
  type,
  title,
  x_axis: { type: 'time' },
  y_axis: { label: yLabel, ...(unit && { unit }) },
  ...(stacked && { stacked }),
  series,
  ...(annotations && { annotations }),
});

const categoryChart = ({
  title,
  xLabel,
  yLabel,
  unit,
  seriesName,
  values,
}: {
  title: string;
  xLabel: string;
  yLabel: string;
  unit?: ChartUnit;
  seriesName: string;
  values: Record<string, number>;
}): EvidenceChart => ({
  type: 'bar',
  title,
  x_axis: { type: 'category', label: xLabel },
  y_axis: { label: yLabel, ...(unit && { unit }) },
  series: [{ name: seriesName, points: Object.entries(values).map(([x, y]) => ({ x, y })) }],
});

const evidence = (description: string, chart?: EvidenceChart): InvestigationEvidence => ({
  description,
  ...(chart && { chart }),
});

/** Chart-only evidence, for when the surrounding text already says what the chart shows. */
const chartEvidence = (chart: EvidenceChart): InvestigationEvidence => ({ chart });

const hypothesis = (
  candidate: string,
  confidence: number,
  status: Hypothesis['status'],
  reason: string,
  ...evidences: InvestigationEvidence[]
): Hypothesis => ({
  candidate,
  confidence,
  status,
  reason,
  ...(evidences.length > 0 && { evidence: evidences }),
});

/** `proposals.create` takes a confidence level, not a score. */
const toConfidenceLevel = (score: number): ProposalConfidence =>
  score >= 0.85 ? 'high' : score >= 0.7 ? 'medium' : 'low';

/** A proposed action. Its comment is the description, then the command in a fenced block. */
const recommendation = (
  title: string,
  confidence: number,
  description: string,
  code?: string
): SeedProposal => ({
  title,
  confidence: toConfidenceLevel(confidence),
  comment: code ? `${description}\n\n\`\`\`\n${code}\n\`\`\`` : description,
});

/** An impacted entity. The agent's `set_impact` tool defaults the id to the name. */
const entity = (
  name: string,
  type: string,
  streamName: string,
  featureId?: string,
  entityEvidence?: InvestigationEvidence
): ImpactEntity => ({
  id: name,
  name,
  type,
  streamName,
  ...(featureId && { featureId }),
  ...(entityEvidence && { evidence: entityEvidence }),
});

/** An investigation the agent finished: findings, impact, and proposed actions. */
const completed = ({
  severity,
  title,
  subject,
  minutesAgo,
  durationMinutes,
  triggerType = 'automatic',
  status = 'open',
  summary,
  verdict,
  hypotheses,
  recommendations = [],
  impact,
  impactMap,
}: {
  severity: InvestigationSeverity;
  title: string;
  subject: SeedSubject;
  minutesAgo: number;
  durationMinutes: number;
  triggerType?: InvestigationSubjectTriggerType;
  status?: InvestigationMetadataStatus;
  summary: string;
  verdict: string;
  hypotheses?: Hypothesis[];
  recommendations?: SeedProposal[];
  impact: SeedImpact;
  impactMap?: SeedImpactMap;
}): Scenario => ({
  title,
  status,
  severity,
  summary,
  verdict,
  subject,
  triggerType,
  hypotheses,
  impact,
  impactMap,
  proposals: recommendations,
  createdMinutesAgo: minutesAgo + durationMinutes,
  updatedMinutesAgo: minutesAgo,
});

/**
 * An investigation without findings: one that was just started, or whose run ended before the
 * agent recorded any. Investigations keep no run status, so these are open (or closed) and not in
 * progress.
 */
const unfinished = ({
  status = 'open',
  title,
  subject,
  minutesAgo,
  triggerType = 'automatic',
}: {
  status?: InvestigationMetadataStatus;
  title: string;
  subject: SeedSubject;
  minutesAgo: number;
  triggerType?: InvestigationSubjectTriggerType;
}): Scenario => ({
  title,
  status,
  subject,
  triggerType,
  proposals: [],
  createdMinutesAgo: minutesAgo,
  updatedMinutesAgo: minutesAgo,
});

/** An alert subject's snapshot, as the start route records it from the alert document. */
const alertSnapshot = (
  id: string,
  ruleName: string,
  reason: string,
  startMinutesAgo: number
): AlertSubjectSnapshot => ({
  id,
  rule_id: `seed-rule-${id}`,
  rule_name: ruleName,
  rule_type_id: 'observability.rules.custom_threshold',
  rule_category: 'Custom threshold',
  reason,
  status: 'active',
  start: iso(startMinutesAgo),
  timestamp: iso(startMinutesAgo),
});

/** Slack thread of the seeded Slack question (`toSlackThreadKey` in nightshift_investigations). */
const SLACK_THREAD = {
  workspace: 'T0SEED0001',
  channel: 'C0SEEDSRE1',
  threadTs: '1790000000.000100',
  statusMessageTs: '1790000001.000200',
};
const SLACK_THREAD_KEY = `slack:${SLACK_THREAD.workspace}:${SLACK_THREAD.channel}:${SLACK_THREAD.threadTs}`;

const SCENARIOS: Scenario[] = [
  completed({
    severity: 'critical',
    title: 'api-gateway v2.8.1 auth middleware blocks the event loop',
    subject: {
      type: 'significant_event',
      id: 'evt-001',
      summary: 'Web frontend — login and browse latency',
    },
    minutesAgo: 40,
    durationMinutes: 6,
    summary:
      'P95 latency on web-frontend rose from about 120ms to 890ms within ten minutes of the api-gateway v2.8.1 rollout. Every slow request passes through the new auth middleware, which does a synchronous session lookup against Postgres.',
    verdict:
      'The api-gateway v2.8.1 auth middleware runs a blocking database query on every request. Under normal browse load the Node.js event loop saturates, and latency spreads to every route that api-gateway fronts, including web-frontend login and browse.',
    hypotheses: [
      hypothesis(
        'Synchronous session lookup in the v2.8.1 auth middleware',
        0.93,
        'confirmed',
        'Latency starts with the rollout, and only routes behind the auth middleware slow down.',
        evidence(
          'P95 latency on web-frontend crosses **800ms** within ten minutes of the deploy.',
          timeChart({
            title: 'web-frontend P95 latency',
            yLabel: 'P95 latency',
            unit: 'ms',
            series: [
              timeSeries(
                'P95 latency',
                40,
                [118, 121, 119, 124, 122, 410, 760, 870, 890, 885, 892, 888]
              ),
            ],
            annotations: [annotation(70, 'api-gateway v2.8.1 rollout')],
          })
        ),
        evidence(
          'api-gateway logs show event loop lag warnings from `authMiddleware` from the rollout onwards.',
          timeChart({
            title: 'Event loop lag warnings on api-gateway',
            type: 'bar',
            yLabel: 'Warnings per 5 minutes',
            unit: 'number',
            series: [
              timeSeries('Warnings', 40, [0, 0, 0, 0, 0, 140, 310, 355, 362, 348, 371, 360]),
            ],
          })
        )
      ),
      hypothesis(
        'CDN cache miss storm after asset purge',
        0.03,
        'dismissed',
        'Static asset latency stayed flat. Only API routes slowed down.'
      ),
      hypothesis(
        'Postgres connection pool exhaustion',
        0.04,
        'dismissed',
        'Pool utilisation peaked at 60%. Blocked queries wait on the event loop, not on connections.'
      ),
    ],
    recommendations: [
      recommendation(
        'Roll back api-gateway to v2.8.0',
        0.9,
        'Restores the asynchronous session cache and removes the blocking lookup from the request path.',
        'kubectl rollout undo deployment/api-gateway -n edge'
      ),
      recommendation(
        'Move the session lookup behind the existing Redis cache',
        0.75,
        'Keeps the new auth checks without a database round trip on each request.'
      ),
    ],
    impact: {
      summary:
        'Signed-in users saw login and page loads slow from about 0.1s to 0.9s for the 35 minutes since the rollout. About 18% of login attempts timed out, across all regions.',
      evidence: chartEvidence(
        timeChart({
          title: 'Login attempts by outcome',
          type: 'bar',
          yLabel: 'Attempts per 5 minutes',
          unit: 'number',
          stacked: true,
          series: [
            timeSeries(
              'Succeeded',
              40,
              [4210, 4180, 4250, 4190, 4230, 3620, 3450, 3480, 3440, 3470, 3460, 3450]
            ),
            timeSeries('Timed out', 40, [8, 11, 9, 7, 10, 610, 760, 770, 780, 765, 772, 768]),
          ],
          annotations: [annotation(70, 'api-gateway v2.8.1 rollout')],
        })
      ),
    },
  }),
  completed({
    severity: 'critical',
    title: 'Transaction batching leaks references and OOM-kills payment-service',
    subject: {
      type: 'significant_event',
      id: 'evt-002',
      summary: 'Payment service — memory growth and OOM restarts',
    },
    minutesAgo: 95,
    durationMinutes: 9,
    summary:
      'payment-service pods restart about every 45 minutes after OOM kills. Heap grows linearly from about 512MB to 2GB between restarts. Growth started when the transaction batching flag was enabled.',
    verdict:
      'The transaction batching feature keeps committed transactions in an unbounded array. Heap grows with payment volume until the kernel OOM-kills the pod, which interrupts in-flight payments on each restart.',
    hypotheses: [
      hypothesis(
        'Unbounded batch buffer retains committed transactions',
        0.9,
        'confirmed',
        'Heap growth rate matches payment throughput, and a heap dump shows millions of retained Transaction objects.',
        evidence(
          'Heap used climbs linearly between restarts and drops back to about 512MB after each OOM kill.',
          timeChart({
            title: 'payment-service heap used',
            yLabel: 'Heap used',
            unit: 'bytes',
            series: [
              timeSeries(
                'Heap used',
                95,
                [0.55, 0.9, 1.3, 1.7, 2.0, 0.52, 0.88, 1.25, 1.65, 1.98, 0.54, 0.9].map((gib) =>
                  Math.round(gib * GIB)
                ),
                15
              ),
            ],
            annotations: [annotation(185, 'OOM kill'), annotation(110, 'OOM kill')],
          })
        ),
        evidence(
          'The heap dump from the last OOM kill is dominated by retained transactions:\n\n| Class | Instances | Retained |\n| --- | --- | --- |\n| `Transaction` | 2.1M | 1.4GB |\n| `BatchEntry` | 2.1M | 310MB |\n| `byte[]` | 0.9M | 120MB |'
        )
      ),
      hypothesis(
        'Container memory limit lowered in the last Helm release',
        0.05,
        'dismissed',
        'The limit has been 2Gi for three months.'
      ),
    ],
    recommendations: [
      recommendation(
        'Disable the transaction batching flag',
        0.92,
        'Stops the leak at once. Pods recover after one restart.'
      ),
      recommendation(
        'Clear the batch buffer after each commit',
        0.8,
        'Fixes the root cause so the flag can be enabled again.'
      ),
    ],
    impact: {
      summary:
        'Each payment-service OOM restart drops the payments in flight on that pod. Over the last three hours about 1.2% of payment attempts failed, in short bursts roughly every 45 minutes.',
      evidence: chartEvidence(
        timeChart({
          title: 'Failed payment attempts',
          type: 'bar',
          yLabel: 'Failures per 15 minutes',
          unit: 'number',
          series: [timeSeries('Failed payments', 95, [3, 4, 2, 5, 6, 212, 3, 4, 5, 6, 198, 4], 15)],
        })
      ),
    },
  }),
  completed({
    severity: 'critical',
    title: 'ILM policy gap fills Elasticsearch data nodes past the high watermark',
    subject: {
      type: 'significant_event',
      id: 'evt-003',
      summary: 'Elasticsearch cluster — disk watermark write throttling',
    },
    minutesAgo: 150,
    durationMinutes: 7,
    summary:
      'Three of five data nodes crossed the 90% disk high watermark. Elasticsearch stopped allocating shards to them and bulk writes started to fail with es_rejected_execution_exception.',
    verdict:
      'A lifecycle migration left 40 daily log indices without an ILM policy, so they never rolled to the warm tier or got deleted. They hold 38% of hot-tier disk.',
    hypotheses: [
      hypothesis(
        'Indices without an ILM policy after the lifecycle migration',
        0.95,
        'confirmed',
        'All oversized indices were created before the migration and have no lifecycle policy.',
        evidence(
          'Three data nodes are above the 90% high watermark.',
          categoryChart({
            title: 'Disk used per data node',
            xLabel: 'Node',
            yLabel: 'Disk used',
            unit: 'percent',
            seriesName: 'Disk used',
            values: {
              'es-data-0': 93,
              'es-data-1': 91,
              'es-data-2': 92,
              'es-data-3': 71,
              'es-data-4': 68,
            },
          })
        ),
        evidence(
          'The largest hot-tier indices have no lifecycle policy:\n\n| Index | Size | ILM policy |\n| --- | --- | --- |\n| `logs-2026.08.01` | 412GB | none |\n| `logs-2026.08.02` | 405GB | none |\n| `logs-2026.08.03` | 398GB | none |'
        )
      ),
      hypothesis(
        'Ingest volume spike',
        0.03,
        'dismissed',
        'Ingest rate is within 5% of the weekly baseline.'
      ),
    ],
    recommendations: [
      recommendation(
        'Attach the logs-default policy to the orphaned indices',
        0.9,
        'Moves them to the warm tier and frees hot-tier disk in about an hour.',
        'PUT logs-2026.08.*/_settings\n{ "index.lifecycle.name": "logs-default" }'
      ),
    ],
    impact: {
      summary:
        'About 7% of log ingest has been rejected for the last 40 minutes, so logs from all 12 services writing to this cluster are incomplete. Search on existing data is unaffected.',
      evidence: chartEvidence(
        timeChart({
          title: 'Rejected bulk requests',
          yLabel: 'Rejected share',
          unit: 'percent',
          series: [
            timeSeries('Rejected', 150, [0, 0, 0.1, 0, 2.4, 6.8, 7.1, 7.3, 6.9, 7.2, 7.0, 7.1]),
          ],
          annotations: [annotation(185, 'es-data-2 crosses 90%')],
        })
      ),
    },
  }),
  completed({
    severity: 'high',
    title: 'Stale JWKS cache rejects valid tokens after IdP key rotation',
    subject: { type: 'significant_event', id: 'evt-009', summary: 'Auth API — elevated 401 rate' },
    minutesAgo: 70,
    durationMinutes: 5,
    summary:
      '401 responses on api-gateway auth routes doubled during the identity provider key rotation. web-frontend login failures rose at the same time.',
    verdict:
      'api-gateway caches the IdP JWKS for 24 hours and does not refresh it on an unknown key ID. Tokens signed with the new key fail until each pod restarts.',
    hypotheses: [
      hypothesis(
        'JWKS cache does not refresh on unknown kid',
        0.88,
        'confirmed',
        'All rejected tokens carry the new key ID, and pods restarted after the rotation accept them.',
        evidence(
          '401 share on api-gateway doubles during the rotation window. Every rejected token carries the new `kid`.',
          timeChart({
            title: '401 share on api-gateway',
            yLabel: '401 share',
            unit: 'percent',
            series: [
              timeSeries('401 share', 70, [4.1, 3.9, 4.2, 4.0, 8.6, 9.1, 8.8, 9.0, 8.7, 8.9]),
            ],
            annotations: [annotation(95, 'IdP key rotation')],
          })
        )
      ),
      hypothesis(
        'Clock skew between pods and the IdP',
        0.04,
        'dismissed',
        'NTP offset is under 50ms on all nodes.'
      ),
    ],
    recommendations: [
      recommendation(
        'Restart api-gateway pods',
        0.85,
        'Forces a JWKS refresh and clears the 401 spike.'
      ),
      recommendation(
        'Refresh JWKS on unknown kid',
        0.8,
        'Prevents the same failure on the next rotation.'
      ),
    ],
    impact: {
      summary:
        'About one in five logins has failed since the key rotation 30 minutes ago. Users who were already signed in are unaffected until their token is refreshed.',
      evidence: chartEvidence(
        timeChart({
          title: 'Failed logins on web-frontend',
          yLabel: 'Failed share',
          unit: 'percent',
          series: [
            timeSeries(
              'Failed logins',
              70,
              [1.2, 1.1, 1.3, 1.2, 19.4, 21.0, 20.2, 20.8, 19.9, 20.5]
            ),
          ],
          annotations: [annotation(95, 'IdP key rotation')],
        })
      ),
    },
  }),
  completed({
    severity: 'high',
    title: 'order-processors stuck in deserialisation retries after schema registry blip',
    subject: {
      type: 'significant_event',
      id: 'evt-006',
      summary: 'Order processing — Kafka consumer lag growth',
    },
    minutesAgo: 30,
    durationMinutes: 8,
    summary:
      'Consumer lag for order-processors grew to about 2.4M messages on partitions 0-7. Throughput fell from about 15k/s to 3k/s after a two-minute schema registry outage.',
    verdict:
      'Consumers cached the registry failure and retry each message with exponential backoff. Throughput never recovers without a consumer restart.',
    hypotheses: [
      hypothesis(
        'Consumers cache the schema registry failure',
        0.86,
        'confirmed',
        'Retry warnings start with the outage and continue after the registry recovered.',
        evidence(
          'Lag grows on all partitions after the outage and keeps growing after the registry recovered.',
          timeChart({
            title: 'order-processors consumer lag',
            yLabel: 'Messages behind',
            unit: 'number',
            series: [
              timeSeries(
                'Lag',
                30,
                [1200, 1500, 1100, 180000, 520000, 910000, 1300000, 1700000, 2050000, 2400000]
              ),
            ],
            annotations: [annotation(62, 'Schema registry outage', 60)],
          })
        )
      ),
      hypothesis(
        'Broker partition leader imbalance',
        0.05,
        'dismissed',
        'Leaders are balanced across brokers.'
      ),
      hypothesis(
        'Downstream order DB slowness',
        0.1,
        'investigating',
        'DB latency rose slightly but may be a side effect.'
      ),
    ],
    recommendations: [
      recommendation(
        'Restart the order-processors consumer group',
        0.8,
        'Clears the cached failure and restores throughput.'
      ),
    ],
    impact: {
      summary:
        'order-processing confirms orders about 25 minutes late and the delay is still growing. No orders have been lost: they are all waiting in Kafka.',
      evidence: chartEvidence(
        timeChart({
          title: 'Orders processed per second',
          yLabel: 'Orders per second',
          unit: 'number',
          series: [
            timeSeries(
              'Throughput',
              30,
              [15100, 14900, 15200, 3100, 2900, 3000, 3200, 2950, 3050, 3000]
            ),
          ],
          annotations: [annotation(62, 'Schema registry outage', 60)],
        })
      ),
    },
  }),
  completed({
    severity: 'high',
    title: 'Code Intelligence index lag from OTel collector memory pressure',
    subject: {
      type: 'alert',
      id: 'alert-code-intel-index-lag',
      summary: 'customer-zero-code-indexer job failures above baseline',
      snapshot: alertSnapshot(
        'alert-code-intel-index-lag',
        'Code indexer job failures above baseline',
        'customer-zero-code-indexer reported sourcerer.failed and job.failed while OTel metric export returned HTTP 400 request body too large and 503 high memory usage.',
        104
      ),
    },
    minutesAgo: 100,
    durationMinutes: 4,
    summary:
      'Code Intelligence searches in Kibana went stale. customer-zero-codebox still fetched repos, but indexer jobs failed when Sourcerer ran and the OTel collector refused oversized metric batches under memory pressure.',
    verdict:
      'Root cause is the OTel collector on the shared Customer 0 intake path refusing exports (body too large / high memory). Indexer and Sourcerer are healthy; the UI lag is a downstream symptom.',
    hypotheses: [
      hypothesis(
        'OTel collector memory pressure breaks indexer telemetry and stalls jobs',
        0.84,
        'confirmed',
        'Indexer logs show Failed to export metrics batch (400 body too large) and 503 high memory usage alongside sourcerer.failed / job.failed.',
        evidence(
          'customer-0 logs: code_indexer.job.failed with concurrent OTLP export refusals from the collector.',
          timeChart({
            title: 'code-indexer job failures',
            type: 'bar',
            yLabel: 'Failures per 10 minutes',
            unit: 'number',
            series: [timeSeries('Failures', 100, [0, 1, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0], 10)],
          })
        )
      ),
    ],
    impactMap: CHECKOUT_IMPACT_MAP,
    recommendations: [
      recommendation(
        'Raise OTel collector memory limits and split oversized metric batches',
        0.7,
        'Stops indexer export refusals that stall Code Intelligence jobs.'
      ),
    ],
    impact: {
      summary:
        'Code Intelligence results in Kibana go stale while customer-zero-code-indexer jobs fail under OTel collector memory pressure. Repo fetch via codebox keeps succeeding between failures.',
      entities: [
        entity(
          'kibana-frontend',
          'service',
          'logs.kibana-frontend',
          'kibana-frontend',
          evidence(
            'UI shows stale code search while indexer jobs fail exporting metrics.',
            timeChart({
              title: 'Code Intelligence error symptoms',
              yLabel: 'Error rate',
              unit: 'percent',
              series: [
                timeSeries(
                  'Error rate',
                  100,
                  [0.4, 8.1, 3.2, 0.5, 0.4, 7.9, 2.9, 0.4, 8.3, 3.0, 0.5, 0.4],
                  10
                ),
              ],
            })
          )
        ),
        entity(
          'payment-service',
          'service',
          'logs.payment-service',
          'payment-service',
          evidence(
            'Payment calls from checkout fail while each pod restarts:\n\n| Restart | Failed calls | Duration |\n| --- | --- | --- |\n| 1 | 212 | 9 min |\n| 2 | 198 | 11 min |\n| 3 | 205 | 10 min |'
          )
        ),
      ],
    },
  }),
  completed({
    severity: 'medium',
    title: 'Catalog index lag returns empty search facets for new SKUs',
    subject: {
      type: 'significant_event',
      id: 'evt-008',
      summary: 'Search API — elevated empty-result rate',
    },
    minutesAgo: 55,
    durationMinutes: 6,
    summary:
      'The empty-result share on search-api rose after the catalog-service deploy. Only SKUs published after the deploy are affected.',
    verdict:
      'The new catalog-service build indexes with a 15-minute refresh interval. New SKUs are invisible to search until the next refresh.',
    hypotheses: [
      hypothesis(
        'Refresh interval changed in the catalog-service deploy',
        0.8,
        'confirmed',
        'Only products created after the deploy are missing.',
        evidence(
          'The catalog index settings changed with the deploy:\n\n| Setting | Before | After |\n| --- | --- | --- |\n| `index.refresh_interval` | `1s` | `15m` |'
        )
      ),
    ],
    recommendations: [
      recommendation(
        'Restore the 1s refresh interval',
        0.85,
        'New SKUs become searchable again within seconds.'
      ),
    ],
    impact: {
      summary:
        'About 340 products published since the deploy do not show up in search for up to 15 minutes. Roughly 4% of searches return no results, up from 1%.',
      evidence: chartEvidence(
        timeChart({
          title: 'Searches with no results',
          yLabel: 'Empty-result share',
          unit: 'percent',
          series: [
            timeSeries(
              'Empty results',
              55,
              [1.0, 1.1, 0.9, 1.0, 3.2, 4.4, 5.1, 2.8, 4.1, 4.9, 2.9, 4.2]
            ),
          ],
          annotations: [annotation(90, 'catalog-service deploy')],
        })
      ),
    },
  }),
  completed({
    severity: 'medium',
    title: 'Nightly batch saturates the cache-service connection pool',
    subject: {
      type: 'manual',
      id: 'manual-cache-latency',
      summary: 'Why does cache latency rise every night at 02:00?',
    },
    minutesAgo: 600,
    durationMinutes: 10,
    triggerType: 'manual',
    summary:
      'cache-service P99 latency rises from 2ms to 40ms every night between 02:00 and 02:20 UTC.',
    verdict:
      'The nightly price-sync batch opens 400 connections to cache-service and exhausts its pool. Online traffic queues behind it for about 20 minutes.',
    hypotheses: [
      hypothesis(
        'price-sync batch exhausts the connection pool',
        0.78,
        'confirmed',
        'Connection count peaks with the batch schedule.',
        evidence(
          'Open connections hit the pool limit of **400** while the batch runs, and P99 latency follows.',
          timeChart({
            title: 'cache-service open connections',
            yLabel: 'Connections',
            unit: 'number',
            series: [
              timeSeries('Open connections', 600, [42, 45, 44, 400, 400, 400, 400, 60, 41, 44]),
            ],
            annotations: [annotation(630, 'price-sync batch', 610)],
          })
        )
      ),
      hypothesis('Redis RDB snapshot at 02:00', 0.1, 'dismissed', 'Snapshots run at 04:00.'),
    ],
    recommendations: [
      recommendation(
        'Limit price-sync to 50 connections',
        0.75,
        'Keeps headroom for online traffic.'
      ),
    ],
    impact: {
      summary:
        'For about 20 minutes each night, cart and pricing reads from cache-service slow from 2ms to 40ms P99. It is a low-traffic hour, so few shoppers notice, and there are no errors.',
      evidence: evidence(
        'P99 latency on cache-service during the batch window:\n\n| Window | P99 latency |\n| --- | --- |\n| 01:40–02:00 | 2ms |\n| 02:00–02:20 | 40ms |\n| 02:20–02:40 | 3ms |'
      ),
    },
  }),
  completed({
    severity: 'low',
    title: 'Cache hit-rate dip was a planned node replacement',
    // Nothing needed doing, so it was closed.
    status: 'closed',
    subject: {
      type: 'significant_event',
      id: 'evt-007',
      summary: 'Cache layer — brief hit-rate dip (dismissed)',
    },
    minutesAgo: 110,
    durationMinutes: 3,
    summary:
      'Redis cache hit rate dipped for about eight minutes. Throughput and error rates stayed flat.',
    verdict:
      'The dip matches a planned node drain. The hit rate recovered once the replacement node warmed up. No action is needed.',
    hypotheses: [
      hypothesis(
        'Planned node drain',
        0.9,
        'confirmed',
        'The maintenance calendar lists the drain at this time.'
      ),
    ],
    impact: {
      summary: 'No user-facing impact. Throughput, latency, and error rates stayed flat.',
    },
  }),
  completed({
    severity: 'low',
    title: 'cert-manager lost DNS01 permissions after RBAC tightening',
    subject: {
      type: 'significant_event',
      id: 'evt-005',
      summary: 'Ingress controller — TLS certificate near expiry',
    },
    minutesAgo: 1300,
    durationMinutes: 5,
    summary:
      'The internal wildcard certificate was 48 hours from expiry. Manual renewal has already restored coverage.',
    verdict:
      'An RBAC change removed cert-manager access to the DNS01 solver secret, so automated renewal failed without an alert.',
    hypotheses: [
      hypothesis(
        'RBAC change removed solver secret access',
        0.85,
        'confirmed',
        'cert-manager logs show forbidden errors since the RBAC change.',
        evidence(
          'cert-manager has failed every renewal attempt since the RBAC change with:\n\n```\nsecrets "dns01-solver" is forbidden: User "system:serviceaccount:cert-manager:cert-manager" cannot get resource "secrets"\n```'
        )
      ),
    ],
    recommendations: [
      recommendation(
        'Restore the cert-manager Role binding',
        0.8,
        'Prevents the next renewal from failing.'
      ),
      recommendation('Alert on renewal failures', 0.7, 'Catches silent failures before expiry.'),
    ],
    impact: {
      summary:
        'No user-facing impact yet. Without the manual renewal, every internal HTTPS endpoint behind the ingress controller would have failed TLS in 48 hours.',
      evidence: evidence(
        'The `*.internal` wildcard certificate served by the ingress was 48 hours from expiry before the manual renewal. The last automated renewal succeeded 58 days ago.'
      ),
    },
  }),
  // Just started: the agent has recorded nothing yet.
  unfinished({
    title: 'DNS resolution failures in us-east-1 AZ-b',
    subject: {
      type: 'significant_event',
      id: 'evt-004',
      summary: 'DNS resolver — intermittent resolution failures',
    },
    minutesAgo: 3,
  }),
  // A question asked in a Slack thread, not answered yet.
  unfinished({
    title: 'Investigate p99 latency on order-processing',
    subject: {
      type: 'slack_thread',
      id: SLACK_THREAD_KEY,
      summary: "Is order-processing slower since yesterday's deploy?",
      slack: {
        channel: SLACK_THREAD.channel,
        thread_ts: SLACK_THREAD.threadTs,
        status_message_ts: SLACK_THREAD.statusMessageTs,
      },
    },
    minutesAgo: 1,
    triggerType: 'manual',
  }),
  // Its run ended before the agent recorded findings. Investigations have no failed state.
  unfinished({
    title: 'Kafka broker disk usage alert',
    subject: {
      type: 'alert',
      id: 'alert-kafka-disk',
      summary: 'Kafka broker disk usage above 80%',
      snapshot: alertSnapshot(
        'alert-kafka-disk',
        'Kafka broker disk usage above 80%',
        'Disk usage on kafka-broker-2 is 84%, above the threshold of 80%.',
        205
      ),
    },
    minutesAgo: 200,
  }),
  // Closed before the agent recorded findings.
  unfinished({
    status: 'closed',
    title: 'Web frontend 5xx spike',
    subject: {
      type: 'manual',
      id: 'manual-web-5xx',
      summary: 'Why did web-frontend return 5xx at 09:10?',
    },
    minutesAgo: 400,
    triggerType: 'manual',
  }),
];

/** The stable conversation id of a scenario: a re-run replaces the same investigation. */
const seedConversationId = ({ subject }: Scenario): string =>
  uuidv5(`nightshift-seed:${subject.id}`, SEED_ID_NAMESPACE);

/**
 * Side-index document id, as `hashInvestigationAttachmentId` in the agentic investigations
 * plugin (`server/investigation_attachments/doc_id.ts`) computes it: a SHA-256 of the
 * length-prefixed parts. Each entity's `documentId` passes its attachment type first, except
 * impact, whose ids predate the factory (`legacyUntypedDocumentIds`).
 */
const hashDocumentId = (...parts: string[]): string =>
  createHash('sha256')
    .update(parts.map((part) => `${part.length}:${part}`).join('\0'))
    .digest('hex');

const subjectDocumentId = (conversationId: string, { type, id }: SeedSubject): string =>
  hashDocumentId(SUBJECT_ATTACHMENT_TYPE, SPACE_ID, conversationId, type, id);
const hypothesesDocumentId = (conversationId: string): string =>
  hashDocumentId(HYPOTHESES_ATTACHMENT_TYPE, SPACE_ID, conversationId);
const impactDocumentId = (conversationId: string): string =>
  hashDocumentId(SPACE_ID, conversationId);

const userMapping = types.object({
  properties: {
    username: types.keyword({}),
    fullName: types.keyword({}),
    email: types.keyword({}),
    profileUid: types.keyword({}),
  },
});

/**
 * Mappings of the side indexes, mirroring each entity's `server/<entity>/storage/*_storage.ts`
 * with the storage adapter's own `types` factories, so every field carries the adapter's defaults
 * (`ignore_above` on keywords, `format` on dates). Only installed when the plugin's storage adapter
 * has not created the index yet; the adapter then puts its versioned mappings on its next read or
 * write, which Elasticsearch only accepts while the field parameters are identical.
 */
const SIDE_INDEX_MAPPINGS: Record<string, StorageSchema['properties']> = {
  [SUBJECT_INDEX_NAME]: {
    spaceId: types.keyword({}),
    conversationId: types.keyword({}),
    subjectType: types.keyword({}),
    subjectId: types.keyword({}),
    summary: types.text({}),
    triggerType: types.keyword({}),
    snapshot: types.object({ enabled: false }),
    slack: types.object({
      properties: {
        channel: types.keyword({}),
        thread_ts: types.keyword({}),
        status_message_ts: types.keyword({}),
        permalink: types.keyword({ index: false }),
        seen_event_ids: types.keyword({ index: false }),
      },
    }),
    createdAt: types.date({}),
    updatedAt: types.date({}),
    createdBy: userMapping,
  },
  [IMPACT_INDEX_NAME]: {
    spaceId: types.keyword({}),
    conversationId: types.keyword({}),
    summary: types.text({}),
    evidence: types.object({ enabled: false }),
    entities: types.nested({
      properties: {
        id: types.keyword({}),
        name: types.keyword({}),
        type: types.keyword({}),
        featureId: types.keyword({}),
        streamName: types.keyword({}),
        evidence: types.object({ enabled: false }),
      },
    }),
    createdAt: types.date({}),
    updatedAt: types.date({}),
    createdBy: userMapping,
  },
  [HYPOTHESES_INDEX_NAME]: {
    spaceId: types.keyword({}),
    conversationId: types.keyword({}),
    hypotheses: types.object({ enabled: false }),
    createdAt: types.date({}),
    updatedAt: types.date({}),
    createdBy: userMapping,
  },
};

/** Indexes a clean removes the seeded investigations' documents from. */
const SEEDED_DOCUMENT_INDEXES = [
  SUBJECT_INDEX_NAME,
  IMPACT_INDEX_NAME,
  IMPACT_MAP_INDEX_NAME,
  HYPOTHESES_INDEX_NAME,
  PROPOSALS_INDEX_NAME,
];

type JsonBody = object | undefined;

interface HttpResponse<TBody> {
  status: number;
  body: TBody;
}

const basicAuth = (credentials: string): string =>
  `Basic ${Buffer.from(credentials).toString('base64')}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `check` every half second until it returns a value, for at most `timeoutMs`. */
const waitFor = async <T>(
  label: string,
  check: () => Promise<T | undefined>,
  timeoutMs = 60_000
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await check();
    if (value !== undefined) {
      return value;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const sendJson = async <TBody>(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: JsonBody,
  okStatuses: number[]
): Promise<HttpResponse<TBody>> => {
  const response = await fetch(url, {
    method,
    headers: { ...headers, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok && !okStatuses.includes(response.status)) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 500)}`);
  }
  return { status: response.status, body: (text ? JSON.parse(text) : {}) as TBody };
};

const resolveKibanaUrl = async (url: string, auth: string): Promise<string> => {
  const base = url.replace(/\/$/, '');
  if (new URL(base).pathname !== '/') {
    return base;
  }
  const response = await fetch(`${base}/`, {
    redirect: 'manual',
    headers: { Authorization: basicAuth(auth) },
  });
  const location = response.headers.get('location');
  return location && /^\/[^/?]+\/?$/.test(location)
    ? `${base}${location.replace(/\/$/, '')}`
    : base;
};

/**
 * Logs in through the basic login form, like a browser does, so the requests carry the user's
 * profile: Agent Builder then records the profile uid as the conversation owner, the same id the
 * user's browser session has. Plain basic auth would record a realm-based id instead, and the
 * browser session would not own the seeded investigations.
 */
const loginHeaders = async (
  kibanaUrl: string,
  auth: string,
  log: ToolingLog
): Promise<Record<string, string>> => {
  const internal = { 'x-elastic-internal-origin': 'kibana', 'kbn-xsrf': 'seed' };
  const { body: loginState } = await sendJson<{
    selector?: { providers?: Array<{ type: string; name: string }> };
  }>(`${kibanaUrl}/internal/security/login_state`, 'GET', internal, undefined, []);
  const provider = loginState.selector?.providers?.find(({ type }) => type === 'basic');
  if (!provider) {
    log.warning(
      'No basic login provider: seeding with basic auth, so your browser session will not own the investigations'
    );
    return { Authorization: basicAuth(auth) };
  }

  const separator = auth.indexOf(':');
  const response = await fetch(`${kibanaUrl}/internal/security/login`, {
    method: 'POST',
    headers: { ...internal, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerType: provider.type,
      providerName: provider.name,
      currentURL: `${kibanaUrl}/login`,
      params: { username: auth.slice(0, separator), password: auth.slice(separator + 1) },
    }),
  });
  if (!response.ok) {
    throw new Error(`Login as ${auth.slice(0, separator)} failed with ${response.status}`);
  }
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
  return { Cookie: cookie };
};

/** Kibana and Elasticsearch, as the seeding user and as kibana_system. */
class SeedClient {
  constructor(
    private readonly options: {
      kibanaUrl: string;
      esUrl: string;
      kibanaHeaders: Record<string, string>;
      kibanaSystemAuth: string;
    }
  ) {}

  /** Agent Builder and Workflows public APIs. */
  publicApi<TBody>(method: string, path: string, body?: JsonBody, okStatuses: number[] = []) {
    return sendJson<TBody>(
      `${this.options.kibanaUrl}${path}`,
      method,
      {
        ...this.options.kibanaHeaders,
        'kbn-xsrf': 'seed',
        'elastic-api-version': PUBLIC_API_VERSION,
      },
      body,
      okStatuses
    );
  }

  /** Internal routes (agentic investigations, proposals, security). */
  internalApi<TBody>(
    method: string,
    path: string,
    version: string,
    body?: JsonBody,
    okStatuses: number[] = []
  ) {
    return sendJson<TBody>(
      `${this.options.kibanaUrl}${path}`,
      method,
      {
        ...this.options.kibanaHeaders,
        'kbn-xsrf': 'seed',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': version,
      },
      body,
      okStatuses
    );
  }

  /** Elasticsearch as kibana_system, which owns the `.kibana-*` and `.chat-*` indexes. */
  es<TBody>(method: string, path: string, body?: JsonBody, okStatuses: number[] = []) {
    return sendJson<TBody>(
      `${this.options.esUrl}${path}`,
      method,
      { Authorization: basicAuth(this.options.kibanaSystemAuth) },
      body,
      okStatuses
    );
  }
}

/** The seeding user, shaped like the agentic investigations plugin's `resolveUser` records it. */
const resolveSeedUser = async (client: SeedClient): Promise<User> => {
  const { status, body: profile } = await client.internalApi<{
    uid?: string;
    user?: { username: string; full_name?: string | null; email?: string | null };
  }>('GET', '/internal/security/user_profile', '1', undefined, [404]);
  if (status === 200 && profile.uid && profile.user) {
    return {
      username: profile.user.username,
      fullName: profile.user.full_name ?? null,
      email: profile.user.email ?? null,
      profileUid: profile.uid,
    };
  }
  const { body: me } = await client.internalApi<{
    username: string;
    full_name?: string | null;
    email?: string | null;
    profile_uid?: string;
  }>('GET', '/internal/security/me', '1');
  return {
    username: me.username,
    fullName: me.full_name ?? null,
    email: me.email ?? null,
    ...(me.profile_uid && { profileUid: me.profile_uid }),
  };
};

/**
 * Makes sure each side index exists as the storage adapter creates it: an index template that
 * puts the alias on `<name>-*`, and the `<name>-000001` write index. Without the template, a
 * write to the alias would auto-create a plain index of that name, which then collides with the
 * adapter's alias. Same approach as the proposals Scout suite's seeding helpers.
 */
const ensureSideIndexes = async (client: SeedClient): Promise<void> => {
  for (const [name, properties] of Object.entries(SIDE_INDEX_MAPPINGS)) {
    const { status: aliasStatus } = await client.es('HEAD', `/_alias/${name}`, undefined, [404]);
    if (aliasStatus === 200) {
      continue;
    }
    const { status: templateStatus } = await client.es(
      'HEAD',
      `/_index_template/${name}`,
      undefined,
      [404]
    );
    if (templateStatus === 404) {
      await client.es('PUT', `/_index_template/${name}?create=true`, {
        index_patterns: [`${name}-*`],
        allow_auto_create: false,
        template: {
          settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
          mappings: { dynamic: 'strict', properties },
          aliases: { [name]: { is_write_index: true } },
        },
      });
    }
    // Only a concurrent create by the adapter is benign; any other 400 (e.g. a plain index that
    // already holds the alias name) must stop the seeding before it writes into the wrong index.
    const { status, body } = await client.es<{ error?: { type?: string; reason?: string } }>(
      'PUT',
      `/${name}-000001`,
      undefined,
      [400]
    );
    if (status === 400 && body.error?.type !== 'resource_already_exists_exception') {
      throw new Error(
        `Creating ${name}-000001 failed: ${body.error?.type ?? 'unknown'} ${
          body.error?.reason ?? ''
        }`
      );
    }
  }
};

const listProposals = async (
  client: SeedClient,
  conversationId: string
): Promise<ListProposalsResponse['proposals']> => {
  const { body } = await client.internalApi<ListProposalsResponse>(
    'GET',
    `${PROPOSALS_INTERNAL_URL}?conversationId=${conversationId}&size=100`,
    PROPOSALS_API_VERSION
  );
  return body.proposals;
};

const executionStatus = async (client: SeedClient, executionId: string): Promise<string> => {
  const { status, body } = await client.publicApi<{ status?: string }>(
    'GET',
    `/api/workflows/executions/${executionId}`,
    undefined,
    [404]
  );
  return status === 404 ? 'not_found' : body.status ?? 'unknown';
};

/**
 * Removes the seeded investigations: cancels the gate workflows still waiting on their proposals,
 * deletes the conversations (with their attachments), then the side-index and proposal documents.
 */
const cleanSeeds = async (client: SeedClient, log: ToolingLog): Promise<void> => {
  const conversationIds = SCENARIOS.map(seedConversationId);

  for (const conversationId of conversationIds) {
    const executions = (await listProposals(client, conversationId)).flatMap(
      ({ workflowExecutionId }) => (workflowExecutionId ? [workflowExecutionId] : [])
    );
    for (const executionId of executions) {
      if (TERMINAL_EXECUTION_STATUSES.includes(await executionStatus(client, executionId))) {
        continue;
      }
      await client.publicApi('POST', `/api/workflows/executions/${executionId}/cancel`, undefined, [
        404,
      ]);
      await waitFor(`gate workflow ${executionId} to stop`, async () => {
        const status = await executionStatus(client, executionId);
        return TERMINAL_EXECUTION_STATUSES.includes(status) || status === 'not_found'
          ? status
          : undefined;
      });
    }
    await client.publicApi(
      'DELETE',
      `/api/agent_builder/conversations/${conversationId}`,
      undefined,
      [404]
    );
  }

  for (const index of SEEDED_DOCUMENT_INDEXES) {
    await client.es(
      'POST',
      `/${index}/_delete_by_query?refresh=true&conflicts=proceed&ignore_unavailable=true`,
      {
        query: {
          bool: {
            filter: [
              { term: { spaceId: SPACE_ID } },
              { terms: { conversationId: conversationIds } },
            ],
          },
        },
      },
      [404]
    );
  }
  log.success(`Removed the ${conversationIds.length} seeded investigations`);
};

/** Indexes one side-index document and returns it with its id, as the services return it. */
const indexDocument = async <TStored extends object>(
  client: SeedClient,
  index: string,
  id: string,
  stored: TStored
): Promise<TStored & { id: string }> => {
  await client.es('PUT', `/${index}/_doc/${id}?refresh=wait_for`, stored);
  return { ...stored, id };
};

/**
 * Attaches a side-index document by reference, as `attachWithPublicClient` does: attachment id and
 * origin are the document id, the data is the document, and it is hidden from the chat.
 */
const attachDocument = async (
  client: SeedClient,
  conversationId: string,
  type: string,
  document: { id: string },
  description?: string
): Promise<void> => {
  await client.publicApi('POST', `/api/agent_builder/conversations/${conversationId}/attachments`, {
    id: document.id,
    type,
    origin: document.id,
    data: document,
    hidden: true,
    ...(description !== undefined && { description }),
  });
};

/** Starts the proposals gate workflow for each proposed action, as `proposals.create` does. */
const createProposals = async (
  client: SeedClient,
  conversationId: string,
  proposals: SeedProposal[]
): Promise<void> => {
  // One at a time, in order: the agent creates one proposal per tool call, strongest first.
  for (const { title, comment, confidence } of proposals) {
    const before = (await listProposals(client, conversationId)).length;
    await client.publicApi('POST', `/api/workflows/workflow/${CREATE_PROPOSAL_WORKFLOW_ID}/run`, {
      inputs: { conversationId, title, comment, origin: 'nightshift', confidence },
    });
    await waitFor(`proposal "${title}"`, async () =>
      (await listProposals(client, conversationId)).length > before ? true : undefined
    );
  }
  // The gate's create step indexes the proposal, then attaches its card.
  await waitFor(`the proposal cards of ${conversationId}`, async () => {
    const { body } = await client.publicApi<{ attachments?: Array<{ type: string }> }>(
      'GET',
      `/api/agent_builder/conversations/${conversationId}`
    );
    const cards = (body.attachments ?? []).filter(({ type }) => type === PROPOSAL_ATTACHMENT_TYPE);
    return cards.length >= proposals.length ? true : undefined;
  });
};

const seedScenario = async (
  client: SeedClient,
  scenario: Scenario,
  user: User
): Promise<string> => {
  const conversationId = seedConversationId(scenario);
  const createdAt = iso(scenario.createdMinutesAgo);
  const updatedAt = iso(scenario.updatedMinutesAgo);
  const base = { spaceId: SPACE_ID, conversationId, createdAt, createdBy: user, updatedAt };

  // Titled at creation, so Agent Builder does not generate one. Seeded open; closing is the
  // status route's job, below.
  await client.publicApi('POST', '/api/agent_builder/conversations', {
    conversation_id: conversationId,
    agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
    title: scenario.title,
    template_id: INVESTIGATION_TEMPLATE_ID,
    access_control: { access_mode: 'public' },
    metadata: {
      status: 'open',
      ...(scenario.severity && { severity: scenario.severity }),
      ...(scenario.summary && { summary: scenario.summary }),
      ...(scenario.verdict && { verdict: scenario.verdict }),
    },
  });

  const { subject } = scenario;
  const subjectDocument = await indexDocument<Omit<InvestigationSubject, 'id'>>(
    client,
    SUBJECT_INDEX_NAME,
    subjectDocumentId(conversationId, subject),
    {
      ...base,
      subjectType: subject.type,
      subjectId: subject.id,
      ...(subject.summary !== undefined && { summary: subject.summary }),
      triggerType: scenario.triggerType,
      ...(subject.snapshot && { snapshot: subject.snapshot }),
      ...(subject.slack && { slack: subject.slack }),
    }
  );
  await attachDocument(client, conversationId, SUBJECT_ATTACHMENT_TYPE, subjectDocument);

  if (scenario.impact) {
    const impactDocument = await indexDocument<Omit<Impact, 'id'>>(
      client,
      IMPACT_INDEX_NAME,
      impactDocumentId(conversationId),
      { ...base, ...scenario.impact }
    );
    await attachDocument(client, conversationId, IMPACT_ATTACHMENT_TYPE, impactDocument);
  }

  if (scenario.hypotheses) {
    const hypothesesDocument = await indexDocument<Omit<InvestigationHypotheses, 'id'>>(
      client,
      HYPOTHESES_INDEX_NAME,
      hypothesesDocumentId(conversationId),
      { ...base, hypotheses: scenario.hypotheses }
    );
    // `agentic_investigations.set_hypotheses` labels the attachment it adds.
    await attachDocument(
      client,
      conversationId,
      HYPOTHESES_ATTACHMENT_TYPE,
      hypothesesDocument,
      'Hypotheses'
    );
  }

  if (scenario.impactMap) {
    await client.internalApi(
      'PUT',
      INVESTIGATION_IMPACT_MAP_URL.replace('{id}', conversationId),
      AGENTIC_INVESTIGATIONS_API_VERSION,
      scenario.impactMap
    );
  }

  await createProposals(client, conversationId, scenario.proposals);

  if (scenario.status === 'closed') {
    await client.internalApi(
      'PUT',
      INVESTIGATION_STATUS_URL.replace('{id}', conversationId),
      AGENTIC_INVESTIGATIONS_API_VERSION,
      { status: 'closed' }
    );
  }

  // Agent Builder stamps creation and every write with the current time, and has no route to
  // set them, so the timeline is written last, to the conversation document itself. The Slack
  // question also gets the conversation origin the `_slack_thread` route creates it with.
  await client.es('POST', `/${CONVERSATIONS_INDEX}/_update/${conversationId}?refresh=wait_for`, {
    doc: {
      created_at: createdAt,
      updated_at: updatedAt,
      ...(subject.type === 'slack_thread' && {
        origin: { external_conversation_id: subject.id },
      }),
    },
  });

  return conversationId;
};

run(
  async ({ log, flags }) => {
    const auth = String(flags.auth);
    const kibanaUrl = await resolveKibanaUrl(String(flags['kibana-url']), auth);
    const client = new SeedClient({
      kibanaUrl,
      esUrl: String(flags['es-url']).replace(/\/$/, ''),
      kibanaHeaders: await loginHeaders(kibanaUrl, auth, log),
      kibanaSystemAuth: String(flags['kibana-system-auth']),
    });

    await cleanSeeds(client, log);
    if (flags.clean) {
      return;
    }

    const user = await resolveSeedUser(client);
    await ensureSideIndexes(client);
    for (const scenario of SCENARIOS) {
      const id = await seedScenario(client, scenario, user);
      log.info(`Seeded ${id}: ${scenario.title}`);
    }
    log.success(`Seeded ${SCENARIOS.length} investigations as ${user.username}`);

    const seededIds = new Set(SCENARIOS.map(seedConversationId));
    const { body } = await client.internalApi<ListInvestigationsResponse>(
      'GET',
      `${INVESTIGATIONS_INTERNAL_URL}?per_page=100`,
      AGENTIC_INVESTIGATIONS_API_VERSION
    );
    const visible = body.results.filter(({ id }) => seededIds.has(id)).length;
    log.info(`Seeded investigations listed by ${INVESTIGATIONS_INTERNAL_URL}: ${visible}`);
    log.info(`Open ${kibanaUrl}/app/nightshift`);
  },
  {
    description: `Seeds ${SCENARIOS.length} Nightshift investigations as shared agentic investigations,
      covering every severity, open and closed, and alert, significant event, question, and Slack
      thread subjects.

      Each one is an Agent Builder investigation conversation with its subject, impact, and
      hypotheses documents attached by reference, and its proposed actions created through the
      proposals gate workflow. No AI connector or investigation workflow run is needed. Re-running
      replaces the earlier seeds; --clean only removes them.`,
    flags: {
      string: ['es-url', 'kibana-url', 'auth', 'kibana-system-auth'],
      boolean: ['clean'],
      default: {
        'es-url': 'http://localhost:9200',
        'kibana-url': 'http://localhost:5601',
        auth: 'elastic:changeme',
        'kibana-system-auth': 'kibana_system:changeme',
        clean: false,
      },
      help: `
        --es-url              Elasticsearch URL (default: http://localhost:9200)
        --kibana-url          Kibana URL; the dev base path is auto-detected (default: http://localhost:5601)
        --auth                Kibana user credentials; this user owns the investigations (default: elastic:changeme)
        --kibana-system-auth  Credentials allowed to write the .kibana-* and .chat-* indexes (default: kibana_system:changeme)
        --clean               Only remove the seeded investigations
      `,
    },
  }
);
