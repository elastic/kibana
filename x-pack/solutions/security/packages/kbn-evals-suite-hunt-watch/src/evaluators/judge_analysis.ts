/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
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

const describeReport = (report: HuntReportExpectation): string => {
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
    lines.push('No confirmed hit, so packaging closes the Investigation as benign.');
  } else if (report.investigationStatus && report.investigationStatus !== 'none') {
    lines.push(`Investigation left ${report.investigationStatus}.`);
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

const describeBehavior = ({ technique_name: name, execution }: HuntBehaviorOutput): string => {
  const label = name ?? 'unnamed behavior';
  if (!execution?.executed) return `${label} not executed`;
  return `${label} executed, ${execution.row_count ?? 0} row(s)`;
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
  const iocs = (recordedIocs ?? []).map(asRecord).flatMap((ioc) => {
    const value = asString(ioc?.value);
    return value ? [`${asString(ioc?.type) ?? 'indicator'} ${value}`] : [];
  });
  const techniques = asStrings(asRecord(extracted?.ttps)?.techniques);
  const timeRange = asRecord(asRecord(actual.coordinator?.tier1)?.time_range);
  const from = asString(timeRange?.from);
  const to = asString(timeRange?.to);
  const indices = asStrings(actual.coordinator?.index_patterns);
  const targets = asStrings(actual.coordinator?.tier2_targets);
  const behaviors = (actual.hunt?.behaviors ?? []).map(describeBehavior);

  const facts = [
    asString(content?.title) && `title "${content?.title}"`,
    asString(source?.name) && `source "${source?.name}"`,
    asString(content?.published_at) && `published ${content?.published_at}`,
    asString(severity?.level) && `source severity ${severity?.level}`,
    iocs.length > 0
      ? `indicators (${iocs.length}): ${iocs.join(', ')}`
      : recordedIocs?.length === 0 && 'no indicators',
    techniques.length > 0 && `ATT&CK techniques: ${techniques.join(', ')}`,
    from && to && `hunt window ${from} to ${to}`,
    indices.length > 0 && `IOC Hunt indices: ${indices.join(', ')}`,
    targets.length > 0 && `Behavior Hunt targets: ${targets.join(', ')}`,
    behaviors.length > 0 && `Behavior Hunt behaviors: ${behaviors.join(', ')}`,
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
      return [describeReport(report), ...(actual ? describeReportFacts(actual) : [])];
    }),
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
    return {
      ...result,
      metadata: { ...(result.metadata ?? {}), ...(judge ? { judge } : {}) },
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
