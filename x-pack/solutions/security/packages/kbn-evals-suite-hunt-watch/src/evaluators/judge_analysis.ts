/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, EvaluationResult, Evaluator } from '@kbn/evals';
import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HuntArtifacts, HuntBehaviorOutput, HuntReportArtifacts } from '../collect';
import type { HuntExpected, HuntReportExpectation, HuntWatchExample } from '../types';
import { errorMessage } from '../kibana_api';

/**
 * The built-in correctness and groundedness judges score a chat turn: a user question, the
 * agent's final message, the tool calls it made, and a ground-truth answer. A hunt run has none
 * of those literally, so this module maps the run onto that shape once per row and stores the
 * judges' analyses on the artifacts; the quantitative evaluators below then read them back.
 *
 * Sequence Accuracy is left out on purpose: the narrative is a verdict, not a procedure, so that
 * metric is `NOT_APPLICABLE` on every row and would only add a saturated 1.0.
 */

export interface JudgeAnalyses {
  correctnessAnalysis?: Record<string, unknown>;
  groundednessAnalysis?: Record<string, unknown>;
}

export interface JudgeProvenance {
  judgeConnectorId: string;
  judgeConnectorName?: string;
}

const TIER1_WORDING: Record<NonNullable<HuntReportExpectation['tier1Status']>, string> = {
  scope_blocked: 'never ran because no required index existed',
  no_searchable_terms: 'ran but the report had no searchable IOCs',
  no_environment_hits: 'ran and found no IOC matches in the environment',
  environment_hits_found: 'ran and found IOC matches in the environment',
};

const describeProposals = (count: HuntReportExpectation['pendingProposals']): string => {
  if (count === undefined) {
    return 'The number of Proposals raised for action is not pinned; any number is acceptable.';
  }
  if (typeof count === 'number') {
    return `${count} pending Proposal${count === 1 ? '' : 's'} raised for action.`;
  }
  return `At least ${count.min} pending Proposal${count.min === 1 ? '' : 's'} raised for action.`;
};

const describeReport = (report: HuntReportExpectation, actual?: HuntReportArtifacts): string => {
  const lines = [
    `Report ${report.reportId}: ${
      report.hasConfirmedHit
        ? 'the environment shows the reported threat (confirmed hit).'
        : 'the environment does not show the reported threat (no confirmed hit).'
    }`,
  ];
  lines.push(
    report.tier1Status
      ? `IOC Hunt ${TIER1_WORDING[report.tier1Status]}.`
      : 'IOC Hunt counts are not pinned; any match count is acceptable.'
  );
  if (report.tier2Executed === undefined) {
    lines.push('Behavior Hunt results are not pinned; any number of behaviors is acceptable.');
  } else {
    lines.push(
      report.tier2Executed
        ? 'Behavior Hunt executed at least one validated ES|QL query.'
        : 'Behavior Hunt executed no queries.'
    );
  }
  lines.push(describeProposals(report.pendingProposals));
  if (report.investigationStatus === 'closed' && !report.hasConfirmedHit) {
    lines.push(
      'No confirmed hit, so packaging closes the Investigation: as benign when the whole report ' +
        'was searched, as other when the report is retired with part of it never searched.'
    );
  } else if (report.investigationStatus && report.investigationStatus !== 'none') {
    lines.push(`Investigation left ${report.investigationStatus}.`);
  }
  const recorded = actual?.conversation?.metadata;
  if (recorded?.status) {
    const reason = recorded.close_reason ? `, close_reason ${recorded.close_reason}` : '';
    lines.push(
      `This run recorded the Investigation as ${recorded.status}${reason}; a narrative that ` +
        'states this recorded state is accurate even where it differs from the expected outcome.'
    );
  }
  return lines.join(' ');
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** The narrative names each matched behavior's technique, severity, confidence, hosts and users. */
const describeBehavior = ({
  technique_name: name,
  technique_id: techniqueId,
  severity,
  confidence,
  execution,
  affected_hosts: hosts,
  affected_users: users,
}: HuntBehaviorOutput): string => {
  const title = [techniqueId, name].filter(Boolean).join(' ') || 'unnamed behavior';
  const rating = [
    severity,
    typeof confidence === 'number' && `confidence ${Math.round(confidence * 100)}%`,
  ].filter(Boolean);
  const label = rating.length > 0 ? `${title} (${rating.join(', ')})` : title;
  if (!execution?.executed) return `${label} not executed`;
  const rows =
    typeof execution.row_count === 'number'
      ? `${execution.row_count} row(s)`
      : 'row count not recorded';
  const hostList = asStrings(hosts);
  const userList = asStrings(users);
  return [
    `${label} executed, ${rows}`,
    hostList.length > 0 && `hosts ${hostList.join(', ')}`,
    userList.length > 0 && `users ${userList.join(', ')}`,
  ]
    .filter(Boolean)
    .join(', ');
};

const describeIocs = (iocs: unknown): string[] =>
  (Array.isArray(iocs) ? iocs : []).map(asRecord).flatMap((ioc) => {
    const value = asString(ioc?.value);
    return value ? [`${asString(ioc?.type) ?? 'indicator'} ${value}`] : [];
  });

/**
 * IOC Hunt searches the indicators it could resolve to a field, capped at the hunt's input
 * limit, so the narrative's indicator count can be lower than the report's. Naming the ones left
 * out keeps a correct "N indicators searched" from reading as a contradiction.
 */
const describeSearchedIocs = (reportIocs: string[], searched: string[]): string => {
  const searchedSet = new Set(searched);
  const skipped = reportIocs.filter((ioc) => !searchedSet.has(ioc));
  const head = `IOC Hunt searched ${searched.length} indicator(s)`;
  if (skipped.length === 0) return head;
  return `${head}; not searched: ${skipped.join(', ')}`;
};

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const namedCounts = (value: unknown): string[] =>
  (Array.isArray(value) ? value : []).map(asRecord).flatMap((entry) => {
    const name = asString(entry?.name) ?? asString(entry?.index);
    if (!name) return [];
    const count = asNumber(entry?.hit_count);
    return [count === undefined ? name : `${name} (${count})`];
  });

/** IOC Hunt's match totals and where they landed: the narrative quotes each of these counts. */
const describeIocHits = (tier1: Record<string, unknown> | undefined): string[] => {
  const total = asNumber(asRecord(tier1?.counts)?.total_hits);
  const perIndex = namedCounts(tier1?.per_index);
  const assets = asRecord(tier1?.affected_assets);
  const hosts = namedCounts(assets?.hosts);
  const users = namedCounts(assets?.users);
  const services = namedCounts(assets?.services);
  return [
    total !== undefined &&
      `IOC Hunt matched ${total} document(s)${
        perIndex.length > 0 ? ` across ${perIndex.length} index(es): ${perIndex.join(', ')}` : ''
      }`,
    hosts.length > 0 && `affected hosts: ${hosts.join(', ')}`,
    users.length > 0 && `affected users: ${users.join(', ')}`,
    services.length > 0 && `affected services: ${services.join(', ')}`,
  ].filter((fact): fact is string => typeof fact === 'string');
};

/**
 * Pending Proposals split by who raised them. The narrative names the ones another Investigation
 * raised and this run joined instead of duplicating, so a correct "already awaiting a decision,
 * raised by another Investigation" needs that attribution, not just the title.
 */
const describeSpaceProposals = (artifacts?: HuntArtifacts): string[] => {
  const ownConversations = new Set(
    Object.values(artifacts?.reports ?? {}).flatMap(({ conversation }) =>
      conversation ? [conversation.id] : []
    )
  );
  const own: string[] = [];
  const other: string[] = [];
  for (const { title, conversationId } of artifacts?.pendingProposalsInSpace ?? []) {
    if (title) (ownConversations.has(conversationId) ? own : other).push(`"${title}"`);
  }
  return [
    own.length > 0 && `Pending Proposals raised by this run's Investigation: ${own.join(', ')}.`,
    other.length > 0 &&
      `Pending Proposals already raised by other Investigations in the space: ${other.join(', ')}.`,
  ].filter((fact): fact is string => typeof fact === 'string');
};

/**
 * The report's own metadata, the scope the run searched and the behaviors it executed. The
 * narrative quotes these, and without them every accurate quote reads as NOT_IN_GROUND_TRUTH,
 * which caps Factuality on a correct narrative. They are recorded facts, not expectations: the
 * pinned verdict lines above still decide whether the narrative's conclusion is right.
 */
const describeReportFacts = (actual: HuntReportArtifacts): string[] => {
  const doc = actual.reportDoc;
  if (!doc) return [];
  const content = asRecord(doc.content);
  const source = asRecord(doc.source);
  const severity = asRecord(doc.severity);
  const extracted = asRecord(doc.extracted);
  const recordedIocs = Array.isArray(extracted?.iocs) ? extracted.iocs : undefined;
  const iocs = describeIocs(recordedIocs);
  const tier1 = asRecord(actual.coordinator?.tier1);
  const searchedIocs = Array.isArray(tier1?.resolved_iocs)
    ? describeIocs(tier1?.resolved_iocs)
    : undefined;
  const recordedTechniques = asRecord(extracted?.ttps)?.techniques;
  const techniques = asStrings(recordedTechniques);
  const timeRange = asRecord(tier1?.time_range);
  const from = asString(timeRange?.from);
  const to = asString(timeRange?.to);
  const indices = asStrings(actual.coordinator?.index_patterns);
  const targets = asStrings(actual.coordinator?.tier2_targets);
  const runId = asString(actual.coordinator?.run_id);
  const behaviors = (actual.hunt?.behaviors ?? []).map(describeBehavior);
  const gaps = (actual.hunt?.coverage_gaps ?? []).flatMap(
    ({ reason, technique_id: id, detail }) => {
      const text = [reason, id, detail].filter(Boolean).join(' ');
      return text ? [text] : [];
    }
  );

  const facts = [
    asString(content?.title) && `title "${content?.title}"`,
    asString(source?.name) && `source "${source?.name}"`,
    asString(content?.published_at) && `published ${content?.published_at}`,
    asString(severity?.level) && `source severity ${severity?.level}`,
    iocs.length > 0
      ? `report indicators (${iocs.length}): ${iocs.join(', ')}`
      : recordedIocs?.length === 0 && 'no indicators',
    searchedIocs && describeSearchedIocs(iocs, searchedIocs),
    techniques.length > 0
      ? `ATT&CK techniques: ${techniques.join(', ')}`
      : Array.isArray(recordedTechniques) && 'ATT&CK techniques: none',
    runId && `hunt run ${runId}`,
    from && to && `hunt window ${from} to ${to}`,
    indices.length > 0 && `IOC Hunt indices: ${indices.join(', ')}`,
    targets.length > 0 && `Behavior Hunt targets: ${targets.join(', ')}`,
    ...describeIocHits(tier1),
    behaviors.length > 0
      ? `Behavior Hunt behaviors: ${behaviors.join(' | ')}`
      : actual.hunt?.behaviors && 'Behavior Hunt derived no behaviors',
    gaps.length > 0 && `coverage gaps: ${gaps.join(' | ')}`,
  ].filter((fact): fact is string => typeof fact === 'string');
  return facts.length > 0 ? [`Report ${actual.reportId} facts: ${facts.join('; ')}.`] : [];
};

export const buildJudgeQuestion = ({ spaceId, reportIds }: HuntWatchExample['input']): string =>
  `Run the continuous threat hunt over threat report(s) ${reportIds.join(', ')} in Kibana ` +
  `space "${spaceId}". For each report, state whether the environment shows the reported threat, ` +
  `what IOC Hunt and Behavior Hunt found, and what action, if any, is proposed.`;

/**
 * A row that pins `partial` alone expects an incomplete run, and the judge has to know that:
 * without it, a narrative that calls the result incomplete reads as contradicting "no confirmed
 * hit" and is marked inaccurate for saying exactly what the row asks it to say.
 */
const describeOutcome = (expected: HuntWatchExample['output']['expected']): string[] => {
  if (expected.outcome?.length !== 1 || expected.outcome[0] !== 'partial') return [];
  const stage = expected.incompleteStage ? ` at the ${expected.incompleteStage} stage` : '';
  return [
    `The run ends partial${stage}: part of the work did not complete, so the results are ` +
      'incomplete rather than a clean or complete verdict, and the narrative is expected to say so.',
  ];
};

export const buildGroundTruth = (
  { expected, criteria }: HuntWatchExample['output'],
  artifacts?: HuntArtifacts
): string =>
  [
    'The hunt runs IOC Hunt first, then Behavior Hunt, then records a verdict.',
    ...describeOutcome(expected),
    ...expected.reports.flatMap((report) => {
      const actual = artifacts?.reports[report.reportId];
      return [describeReport(report, actual), ...(actual ? describeReportFacts(actual) : [])];
    }),
    ...describeSpaceProposals(artifacts),
    ...(criteria.length > 0 ? ['The narrative must also satisfy:', ...criteria] : []),
  ].join('\n');

interface ToolCallRecord {
  tool_call_id: string;
  tool_id: string;
  result: unknown;
}

/** The report fields the Worker's narrative quotes, without the raw source body. */
const threatReportFacts = (doc: NonNullable<HuntReportArtifacts['reportDoc']>) => {
  const source = doc.source as { name?: string; type?: string } | undefined;
  const content = doc.content as { published_at?: unknown } | undefined;
  return {
    published_at: content?.published_at,
    source: source ? { name: source.name, type: source.type } : undefined,
    severity: doc.severity,
    content: doc.content,
    extracted: doc.extracted,
    geography: doc.geography,
  };
};

const reportToolCalls = (report: HuntReportArtifacts): ToolCallRecord[] => {
  const calls: ToolCallRecord[] = [];
  if (report.reportDoc) {
    calls.push({
      tool_call_id: `${report.reportId}:threat_report`,
      tool_id: 'threat_report',
      result: threatReportFacts(report.reportDoc),
    });
  }
  if (report.hunt) {
    calls.push({ tool_call_id: `${report.reportId}:hunt`, tool_id: 'hunt', result: report.hunt });
  }
  if (report.coordinator) {
    calls.push({
      tool_call_id: `${report.reportId}:hunt_coordinator`,
      tool_id: 'hunt_coordinator',
      result: report.coordinator,
    });
  }
  report.sseEvents.forEach((sse, index) => {
    if (sse.hunt_result) {
      calls.push({
        tool_call_id: `${report.reportId}:sse:${index}`,
        tool_id: 'significant_security_event',
        result: sse.hunt_result,
      });
    }
  });
  if (report.packaging) {
    calls.push({
      tool_call_id: `${report.reportId}:package_report`,
      tool_id: 'package_report',
      result: report.packaging,
    });
  }
  if (report.proposals.length > 0) {
    calls.push({
      tool_call_id: `${report.reportId}:proposals`,
      tool_id: 'proposals',
      result: report.proposals.map(({ id, status, title }) => ({ id, status, title })),
    });
  }
  if (report.reportDoc?.evidence) {
    calls.push({
      tool_call_id: `${report.reportId}:evidence`,
      tool_id: 'write_hunt_evidence',
      result: report.reportDoc.evidence,
    });
  }
  return calls;
};

export const buildToolCallHistory = (
  artifacts: HuntArtifacts,
  kibanaUrl?: string
): ToolCallRecord[] => [
  {
    tool_call_id: 'worker_execution',
    tool_id: 'worker_execution',
    result: {
      kibanaUrl,
      spaceId: artifacts.spaceId,
      workflowExecutionId: artifacts.workflowExecutionId,
      status: artifacts.executionStatus,
      selectedIds: artifacts.selectedIds,
      skipped: artifacts.skipped,
    },
  },
  ...Object.values(artifacts.reports).flatMap(reportToolCalls),
  {
    tool_call_id: 'proposals_in_space',
    tool_id: 'proposals_in_space',
    result: artifacts.pendingProposalsInSpace.map(({ id, status, title, conversationId }) => ({
      id,
      status,
      title,
      conversationId,
    })),
  },
];

export const narrativeOf = (artifacts: HuntArtifacts): string =>
  Object.values(artifacts.reports)
    .map((r) => r.narrative)
    .filter(Boolean)
    .join('\n\n---\n\n');

/** Runs both judge analyses for one row. Returns nothing when there is no narrative to judge. */
export const runJudgeAnalyses = async ({
  evaluators,
  example,
  artifacts,
  kibanaUrl,
  log,
}: {
  evaluators: DefaultEvaluators;
  example: Pick<HuntWatchExample, 'input' | 'output'>;
  artifacts: HuntArtifacts;
  /** Lets the judge ground the execution detail link the narrative ends with. */
  kibanaUrl?: string;
  log: ToolingLog;
}): Promise<JudgeAnalyses> => {
  const narrative = narrativeOf(artifacts);
  if (!narrative) return {};

  const params = {
    input: { question: buildJudgeQuestion(example.input) },
    output: {
      messages: [{ message: narrative }],
      steps: buildToolCallHistory(artifacts, kibanaUrl),
    },
    expected: { expected: buildGroundTruth(example.output, artifacts) },
    metadata: undefined,
  };
  const [correctness, groundedness] = await Promise.allSettled([
    evaluators.correctnessAnalysis().evaluate(params),
    evaluators.groundednessAnalysis().evaluate(params),
  ]);
  for (const [name, result] of [
    ['correctness', correctness],
    ['groundedness', groundedness],
  ] as const) {
    if (result.status === 'rejected') {
      log.warning(`[hunt-watch] ${name} analysis failed: ${errorMessage(result.reason)}`);
    }
  }
  return {
    correctnessAnalysis:
      correctness.status === 'fulfilled' ? correctness.value.metadata : undefined,
    groundednessAnalysis:
      groundedness.status === 'fulfilled' ? groundedness.value.metadata : undefined,
  };
};

/**
 * Rows where the Worker is expected to post nothing: no Investigation at all, or a run pinned to
 * `failed` alone (the conclusion step has no Investigation it can write to). A judge reading
 * those as MISSING would report the expected behavior as a gap.
 */
export const expectsNoNarrative = (expected: HuntExpected): boolean =>
  expected.reports.every((r) => r.investigationStatus === 'none') ||
  (expected.outcome?.length === 1 && expected.outcome[0] === 'failed');

const FACTUALITY_PASS_LABELS: ReadonlySet<string> = new Set(['ACCURATE', 'MINOR_INACCURACIES']);

/**
 * Factuality scores the judge's own verdict, not the geometric mean of its claim scores. On a
 * correct narrative, true detail the synthesized ground truth does not pin reads as
 * NOT_IN_GROUND_TRUTH (0.5 per claim), so the mean falls below 0.8 even when the judge itself
 * calls the narrative ACCURATE or MINOR_INACCURACIES. On the golden cohort two independent
 * graders agreed with the verdict label on 63/65 and 55/65 rows, against 35/65 and 45/65 for the
 * claim mean. The claim mean stays in metadata as `claimScore`.
 */
const scoreFactualityByVerdict = (result: EvaluationResult): EvaluationResult => {
  if (typeof result.label !== 'string') return result;
  return {
    ...result,
    score: FACTUALITY_PASS_LABELS.has(result.label) ? 1 : 0,
    metadata: { ...(result.metadata ?? {}), claimScore: result.score },
  };
};

/**
 * Wraps a built-in quantitative judge so it reads the analyses stored on the hunt artifacts and
 * reports in this suite's N/A (no Investigation expected) vs MISSING (judge produced nothing) terms.
 */
const adaptJudgeEvaluator = (
  evaluator: Evaluator,
  judge?: JudgeProvenance
): Evaluator<HuntWatchExample, HuntArtifacts> => ({
  name: evaluator.name,
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async ({ input, output, expected }) => {
    if (expectsNoNarrative(expected.expected)) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'row expects no Investigation narrative, so there is nothing to judge',
      };
    }
    const result = await evaluator.evaluate({
      input,
      output: {
        correctnessAnalysis: output.correctnessAnalysis,
        groundednessAnalysis: output.groundednessAnalysis,
      },
      expected,
      metadata: undefined,
    });
    if (result.label === 'unavailable') {
      return {
        score: null,
        label: 'MISSING',
        explanation: 'judge analysis unavailable: no narrative was posted or the judge call failed',
      };
    }
    const scored = evaluator.name === 'Factuality' ? scoreFactualityByVerdict(result) : result;
    return {
      ...scored,
      metadata: { ...(scored.metadata ?? {}), ...(judge ? { judge } : {}) },
    };
  },
});

const CORRECTNESS_EVALUATOR_NAMES = ['Factuality', 'Relevance'];

export const createJudgeEvaluators = (
  judge?: JudgeProvenance
): Array<Evaluator<HuntWatchExample, HuntArtifacts>> =>
  [
    ...createQuantitativeCorrectnessEvaluators().filter((e) =>
      CORRECTNESS_EVALUATOR_NAMES.includes(e.name)
    ),
    createQuantitativeGroundednessEvaluator(),
  ].map((evaluator) => adaptJudgeEvaluator(evaluator, judge));
