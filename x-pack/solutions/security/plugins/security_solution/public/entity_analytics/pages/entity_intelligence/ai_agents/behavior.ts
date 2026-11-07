/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentBehaviorAnalysis,
  AgentBehaviorInput,
  BehaviorComparison,
  BehaviorComparisonStatus,
  BehaviorEvidence,
  BehaviorFinding,
  BehaviorFindingKind,
  BehaviorRules,
  BehaviorToolCall,
  BehaviorToolSummary,
  BehaviorUnit,
  BehaviorWindow,
  BehaviorWindowSummary,
} from './behavior_types';

export const DEFAULT_BEHAVIOR_RULES: Readonly<BehaviorRules> = {
  minimumBaselineUnits: 5,
  minimumBaselineKnownOutcomes: 20,
  minimumCurrentKnownOutcomes: 10,
  minimumCurrentFailures: 3,
  failureRateIncrease: 0.2,
  failureRateRatio: 2,
  repeatedFailures: 3,
  repeatedFailureWindowMs: 5 * 60 * 1000,
  volumeRatio: 3,
  minimumCurrentToolCalls: 10,
  durationRatio: 3,
  minimumDurationMs: 60 * 1000,
  maximumEvidence: 20,
};

interface PreparedUnit {
  unit: BehaviorUnit;
  calls: BehaviorToolCall[];
  tools: BehaviorToolSummary[];
  count: number;
  toolsComplete: boolean;
  detailsComplete: boolean;
}

interface PreparedWindow {
  units: PreparedUnit[];
  summary: BehaviorWindowSummary;
}

const kinds: BehaviorFindingKind[] = [
  'new_tool',
  'failure_rate_increase',
  'repeated_tool_failures',
  'tool_volume_increase',
  'duration_increase',
];

const hasToolName = (tool: { toolName?: string; nameRedacted?: boolean }): boolean =>
  !tool.nameRedacted && Boolean(tool.toolName?.trim());

const isCount = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

const isValidSummary = (tools: BehaviorToolSummary[]): boolean =>
  tools.every(
    ({ count, successCount, failureCount, unknownCount }) =>
      [count, successCount, failureCount, unknownCount].every(isCount) &&
      count === successCount + failureCount + unknownCount
  );

const toolKey = (tool: { toolName?: string; nameRedacted?: boolean }): string =>
  hasToolName(tool) ? `named:${tool.toolName}` : 'unnamed';

const aggregateSummaries = (tools: BehaviorToolSummary[]): Map<string, BehaviorToolSummary> => {
  const summaries = new Map<string, BehaviorToolSummary>();
  tools.forEach((tool) => {
    const key = toolKey(tool);
    const previous = summaries.get(key);
    summaries.set(key, {
      ...tool,
      count: (previous?.count ?? 0) + tool.count,
      successCount: (previous?.successCount ?? 0) + tool.successCount,
      failureCount: (previous?.failureCount ?? 0) + tool.failureCount,
      unknownCount: (previous?.unknownCount ?? 0) + tool.unknownCount,
    });
  });
  return summaries;
};

const summarizeCalls = (calls: BehaviorToolCall[]): BehaviorToolSummary[] => {
  const summaries = new Map<string, BehaviorToolSummary>();
  calls.forEach((call) => {
    const named = hasToolName(call);
    const key = toolKey(call);
    const summary = summaries.get(key) ?? {
      toolName: named ? call.toolName : undefined,
      nameRedacted: !named,
      count: 0,
      successCount: 0,
      failureCount: 0,
      unknownCount: 0,
    };
    summary.count += 1;
    if (call.outcome === 'success') summary.successCount += 1;
    if (call.outcome === 'failure') summary.failureCount += 1;
    if (call.outcome === 'unknown') summary.unknownCount += 1;
    summaries.set(key, summary);
  });
  return [...summaries.values()];
};

const prepareUnit = (unit: BehaviorUnit, end: number): PreparedUnit => {
  const startedAt = Date.parse(unit.startedAt);
  const observedThrough = unit.observedThrough ? Date.parse(unit.observedThrough) : undefined;
  const observationValid =
    observedThrough === undefined ||
    (Number.isFinite(observedThrough) && observedThrough >= startedAt && observedThrough < end);
  const callsById = new Map<string, BehaviorToolCall>();
  let validCallMetadata = true;
  unit.toolCalls.forEach((call) => {
    const timestamp = Date.parse(call.timestamp);
    if (
      !call.id ||
      !Number.isFinite(timestamp) ||
      timestamp < startedAt ||
      timestamp >= end ||
      (observedThrough !== undefined && timestamp > observedThrough)
    ) {
      validCallMetadata = false;
      return;
    }
    const previous = callsById.get(call.id);
    if (
      previous &&
      (previous.timestamp !== call.timestamp ||
        previous.outcome !== call.outcome ||
        toolKey(previous) !== toolKey(call))
    ) {
      validCallMetadata = false;
    }
    if (!previous) callsById.set(call.id, call);
  });
  const calls = [...callsById.values()].sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp)
  );
  const validSummary = !unit.toolSummary || isValidSummary(unit.toolSummary.tools);
  const tools = unit.toolSummary && validSummary ? unit.toolSummary.tools : summarizeCalls(calls);
  const count = tools.reduce((total, tool) => total + tool.count, 0);
  const declaredDetailsComplete =
    unit.toolCallsComplete ?? (!unit.toolSummary && unit.toolsComplete);
  const summariesByTool = aggregateSummaries(tools);
  const detailedByTool = aggregateSummaries(summarizeCalls(calls));
  const consistentDetails =
    !declaredDetailsComplete ||
    (summariesByTool.size === detailedByTool.size &&
      [...summariesByTool].every(([key, summary]) => {
        const detailed = detailedByTool.get(key);
        return (
          detailed?.successCount === summary.successCount &&
          detailed.failureCount === summary.failureCount &&
          detailed.unknownCount === summary.unknownCount
        );
      }));
  const consistentCounts = calls.length <= count && consistentDetails;
  return {
    unit,
    calls,
    tools,
    count,
    toolsComplete:
      unit.toolsComplete &&
      observationValid &&
      validSummary &&
      consistentCounts &&
      (!declaredDetailsComplete || validCallMetadata) &&
      (Boolean(unit.toolSummary) || validCallMetadata),
    detailsComplete: declaredDetailsComplete && validCallMetadata && consistentCounts,
  };
};

const prepareWindow = (agentId: string, window: BehaviorWindow): PreparedWindow => {
  const start = Date.parse(window.start);
  const end = Date.parse(window.end);
  const seen = new Set<string>();
  let invalidUnits = false;
  const units: PreparedUnit[] = [];
  window.units.forEach((unit) => {
    if (unit.agentId !== agentId || seen.has(unit.id)) return;
    const timestamp = Date.parse(unit.startedAt);
    if (!unit.id || !Number.isFinite(timestamp)) {
      invalidUnits = true;
      return;
    }
    if (timestamp < start || timestamp >= end) return;
    seen.add(unit.id);
    units.push(prepareUnit(unit, end));
  });
  const tools = units.flatMap((unit) => unit.tools);
  const sum = (getCount: (tool: BehaviorToolSummary) => number): number =>
    tools.reduce((total, tool) => total + getCount(tool), 0);
  return {
    units,
    summary: {
      start: window.start,
      end: window.end,
      coverage:
        window.coverage === 'complete' && !invalidUnits && units.every((unit) => unit.toolsComplete)
          ? 'complete'
          : 'partial',
      unitCount: units.length,
      toolCallCount: sum((tool) => tool.count),
      knownOutcomeCount: sum((tool) => tool.successCount + tool.failureCount),
      failureCount: sum((tool) => tool.failureCount),
      unknownOutcomeCount: sum((tool) => tool.unknownCount),
      unnamedToolCallCount: sum((tool) => (hasToolName(tool) ? 0 : tool.count)),
      observedDurationCount: units.filter(
        ({ unit }) => Number.isFinite(unit.durationMs) && (unit.durationMs ?? -1) >= 0
      ).length,
      detailedToolCallCount: units.reduce((total, unit) => total + unit.calls.length, 0),
    },
  };
};

const unitEvidence = ({ unit }: PreparedUnit): BehaviorEvidence => ({
  unitId: unit.id,
  timestamp: unit.startedAt,
  source: unit.source,
});

const callEvidence = (unit: PreparedUnit, call: BehaviorToolCall): BehaviorEvidence => ({
  unitId: unit.unit.id,
  callId: call.id,
  timestamp: call.timestamp,
  source: call.source,
});

const percentile = (values: number[], fraction: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const getRules = (overrides?: Partial<BehaviorRules>): BehaviorRules => {
  const rules = { ...DEFAULT_BEHAVIOR_RULES };
  (Object.keys(rules) as Array<keyof BehaviorRules>).forEach((key) => {
    const value = overrides?.[key];
    if (value !== undefined && Number.isFinite(value) && value > 0) rules[key] = value;
  });
  rules.maximumEvidence = Math.max(1, Math.floor(rules.maximumEvidence));
  return rules;
};

const getComparisonStatus = (
  baseline: BehaviorWindowSummary,
  current: BehaviorWindowSummary,
  rules: BehaviorRules
): BehaviorComparisonStatus => {
  if (!current.unitCount) return 'no_current_data';
  if (baseline.coverage === 'partial' || current.coverage === 'partial')
    return 'incomplete_coverage';
  if (baseline.unitCount < rules.minimumBaselineUnits) return 'insufficient_baseline';
  return 'evaluated';
};

/** Compares explicitly scoped, complete observations without assigning a risk score or inferring intent. */
export const analyzeAgentBehavior = (input: AgentBehaviorInput): AgentBehaviorAnalysis => {
  const rules = getRules(input.rules);
  const baseline = prepareWindow(input.agentId, input.baseline);
  const current = prepareWindow(input.agentId, input.current);
  const windowTimes = [
    Date.parse(input.baseline.start),
    Date.parse(input.baseline.end),
    Date.parse(input.current.start),
    Date.parse(input.current.end),
  ];
  const validWindows =
    windowTimes.every(Number.isFinite) &&
    windowTimes[0] < windowTimes[1] &&
    windowTimes[1] <= windowTimes[2] &&
    windowTimes[2] < windowTimes[3];
  const commonStatus = validWindows
    ? getComparisonStatus(baseline.summary, current.summary, rules)
    : 'invalid_windows';
  const comparisons = {} as Record<BehaviorFindingKind, BehaviorComparison>;
  kinds.forEach((kind) => {
    comparisons[kind] = {
      status: commonStatus,
      baselineSampleSize: baseline.units.length,
      currentSampleSize: current.units.length,
    };
  });
  const findings: BehaviorFinding[] = [];
  const addFinding = (finding: Omit<BehaviorFinding, 'evidenceTruncated'>): void => {
    findings.push({
      ...finding,
      evidence: finding.evidence.slice(0, rules.maximumEvidence),
      evidenceTruncated: finding.evidence.length > rules.maximumEvidence,
    });
  };
  const result: AgentBehaviorAnalysis = {
    agentId: input.agentId,
    unitKind: input.unitKind,
    status: !validWindows
      ? 'invalid_windows'
      : !current.units.length
      ? 'no_current_data'
      : commonStatus === 'incomplete_coverage'
      ? 'partial'
      : commonStatus === 'insufficient_baseline'
      ? 'insufficient_baseline'
      : 'evaluated',
    baseline: baseline.summary,
    current: current.summary,
    comparisons,
    findings,
    toolProfiles: [
      ...new Set(
        [...baseline.units, ...current.units].flatMap((unit) =>
          unit.tools.flatMap((tool) => (hasToolName(tool) && tool.toolName ? [tool.toolName] : []))
        )
      ),
    ]
      .map((name) => {
        const baselineCount = baseline.units.reduce(
          (total, unit) =>
            total +
            unit.tools.reduce(
              (count, tool) =>
                count + (hasToolName(tool) && tool.toolName === name ? tool.count : 0),
              0
            ),
          0
        );
        const currentTools = current.units.flatMap((unit) =>
          unit.tools.filter((tool) => hasToolName(tool) && tool.toolName === name)
        );
        const currentCount = currentTools.reduce((total, tool) => total + tool.count, 0);
        return {
          name,
          baselineCount,
          currentCount,
          currentFailures: currentTools.reduce((total, tool) => total + tool.failureCount, 0),
          baselineShare: baseline.summary.toolCallCount
            ? baselineCount / baseline.summary.toolCallCount
            : 0,
          currentShare: current.summary.toolCallCount
            ? currentCount / current.summary.toolCallCount
            : 0,
        };
      })
      .sort(
        (left, right) =>
          right.currentCount - left.currentCount || left.name.localeCompare(right.name)
      ),
    rules,
  };
  if (!validWindows || !current.units.length) return result;

  comparisons.repeated_tool_failures = {
    status:
      current.summary.coverage === 'partial' || current.units.some((unit) => !unit.detailsComplete)
        ? 'incomplete_coverage'
        : 'evaluated',
    baselineSampleSize: 0,
    currentSampleSize: current.summary.detailedToolCallCount,
  };
  if (!current.units.some((unit) => unit.calls.some(hasToolName))) {
    comparisons.repeated_tool_failures.status = 'unavailable_metadata';
  }
  current.units.forEach((unit) => {
    const callsByTool = new Map<string, BehaviorToolCall[]>();
    unit.calls.forEach((call) => {
      if (!hasToolName(call) || !call.toolName) return;
      const calls = callsByTool.get(call.toolName) ?? [];
      calls.push(call);
      callsByTool.set(call.toolName, calls);
    });
    callsByTool.forEach((calls, toolName) => {
      let runStart = 0;
      let longestStart = 0;
      let longestEnd = 0;
      calls.forEach((call, index) => {
        if (call.outcome !== 'failure') {
          runStart = index + 1;
          return;
        }
        const cutoff = Date.parse(call.timestamp) - rules.repeatedFailureWindowMs;
        while (runStart < index && Date.parse(calls[runStart].timestamp) < cutoff) runStart += 1;
        if (index + 1 - runStart > longestEnd - longestStart) {
          longestStart = runStart;
          longestEnd = index + 1;
        }
      });
      const longest = calls.slice(longestStart, longestEnd);
      if (longest.length < rules.repeatedFailures) return;
      addFinding({
        id: `repeated_tool_failures:${unit.unit.id}:${toolName}`,
        kind: 'repeated_tool_failures',
        unitId: unit.unit.id,
        toolName,
        metric: 'tool_calls',
        observed: longest.length,
        threshold: rules.repeatedFailures,
        baselineSampleSize: 0,
        currentSampleSize: calls.length,
        sampleBased: current.summary.coverage === 'partial' || !unit.detailsComplete,
        evidence: longest.map((call) => callEvidence(unit, call)),
      });
    });
  });

  if (commonStatus !== 'evaluated') return result;

  if (
    baseline.summary.unnamedToolCallCount > 0 ||
    (current.summary.toolCallCount > 0 &&
      current.summary.unnamedToolCallCount === current.summary.toolCallCount)
  ) {
    comparisons.new_tool.status = 'unavailable_metadata';
  } else {
    const priorTools = new Set(
      baseline.units.flatMap((unit) =>
        unit.tools.filter((tool) => tool.count > 0).map((tool) => tool.toolName)
      )
    );
    const newTools = new Set<string>();
    current.units.forEach((unit) => {
      unit.tools.forEach((tool) => {
        if (
          tool.count > 0 &&
          hasToolName(tool) &&
          tool.toolName &&
          !priorTools.has(tool.toolName)
        ) {
          newTools.add(tool.toolName);
        }
      });
    });
    newTools.forEach((toolName) => {
      const relevantUnits = current.units.filter((unit) =>
        unit.tools.some((tool) => hasToolName(tool) && tool.toolName === toolName && tool.count > 0)
      );
      addFinding({
        id: `new_tool:${toolName}`,
        kind: 'new_tool',
        toolName,
        metric: 'tool_calls',
        observed: relevantUnits.reduce(
          (total, unit) =>
            total +
            unit.tools.reduce(
              (count, tool) =>
                count + (hasToolName(tool) && tool.toolName === toolName ? tool.count : 0),
              0
            ),
          0
        ),
        baseline: 0,
        threshold: 0,
        baselineSampleSize: baseline.units.length,
        currentSampleSize: current.units.length,
        sampleBased: false,
        evidence: relevantUnits.flatMap((unit) => {
          const calls = unit.calls.filter(
            (call) => hasToolName(call) && call.toolName === toolName
          );
          return calls.length
            ? calls.map((call) => callEvidence(unit, call))
            : [unitEvidence(unit)];
        }),
      });
    });
  }

  comparisons.failure_rate_increase.baselineSampleSize = baseline.summary.knownOutcomeCount;
  comparisons.failure_rate_increase.currentSampleSize = current.summary.knownOutcomeCount;
  if (baseline.summary.knownOutcomeCount < rules.minimumBaselineKnownOutcomes) {
    comparisons.failure_rate_increase.status = 'insufficient_baseline';
  } else if (current.summary.knownOutcomeCount < rules.minimumCurrentKnownOutcomes) {
    comparisons.failure_rate_increase.status = 'insufficient_current_data';
  } else {
    const baselineRate = baseline.summary.failureCount / baseline.summary.knownOutcomeCount;
    const currentRate = current.summary.failureCount / current.summary.knownOutcomeCount;
    const threshold = Math.max(
      baselineRate + rules.failureRateIncrease,
      baselineRate * rules.failureRateRatio
    );
    if (
      currentRate + Number.EPSILON >= threshold &&
      current.summary.failureCount >= rules.minimumCurrentFailures
    ) {
      addFinding({
        id: 'failure_rate_increase',
        kind: 'failure_rate_increase',
        metric: 'failure_rate',
        observed: currentRate,
        baseline: baselineRate,
        threshold,
        baselineSampleSize: baseline.summary.knownOutcomeCount,
        currentSampleSize: current.summary.knownOutcomeCount,
        sampleBased: false,
        evidence: current.units
          .filter((unit) => unit.tools.some((tool) => tool.failureCount > 0))
          .map(unitEvidence),
      });
    }
  }

  const volumeBaseline = baseline.units.map((unit) => unit.count);
  const baselineMedianVolume = median(volumeBaseline);
  const volumeThreshold = Math.max(
    baselineMedianVolume * rules.volumeRatio,
    percentile(volumeBaseline, 0.95)
  );
  current.units.forEach((unit) => {
    if (unit.count <= volumeThreshold || unit.count < rules.minimumCurrentToolCalls) return;
    addFinding({
      id: `tool_volume_increase:${unit.unit.id}`,
      kind: 'tool_volume_increase',
      unitId: unit.unit.id,
      metric: 'tool_calls',
      observed: unit.count,
      baseline: baselineMedianVolume,
      threshold: Math.max(volumeThreshold, rules.minimumCurrentToolCalls),
      baselineSampleSize: baseline.units.length,
      currentSampleSize: 1,
      sampleBased: false,
      evidence: [unitEvidence(unit)],
    });
  });

  const durationBaseline = baseline.units.flatMap(({ unit }) =>
    unit.durationMs !== undefined && Number.isFinite(unit.durationMs) && unit.durationMs >= 0
      ? [unit.durationMs]
      : []
  );
  const durationCurrent = current.units.filter(
    ({ unit }) =>
      unit.durationMs !== undefined && Number.isFinite(unit.durationMs) && unit.durationMs >= 0
  );
  comparisons.duration_increase.baselineSampleSize = durationBaseline.length;
  comparisons.duration_increase.currentSampleSize = durationCurrent.length;
  if (!durationBaseline.length || !durationCurrent.length) {
    comparisons.duration_increase.status = 'unavailable_metadata';
  } else if (durationBaseline.length < rules.minimumBaselineUnits) {
    comparisons.duration_increase.status = 'insufficient_baseline';
  } else {
    const baselineMedianDuration = median(durationBaseline);
    const durationThreshold = Math.max(
      baselineMedianDuration * rules.durationRatio,
      percentile(durationBaseline, 0.95)
    );
    durationCurrent.forEach((unit) => {
      const duration = unit.unit.durationMs ?? 0;
      if (duration <= durationThreshold || duration < rules.minimumDurationMs) return;
      addFinding({
        id: `duration_increase:${unit.unit.id}`,
        kind: 'duration_increase',
        unitId: unit.unit.id,
        metric: 'milliseconds',
        observed: duration,
        baseline: baselineMedianDuration,
        threshold: Math.max(durationThreshold, rules.minimumDurationMs),
        baselineSampleSize: durationBaseline.length,
        currentSampleSize: 1,
        sampleBased: false,
        evidence: [unitEvidence(unit)],
      });
    });
  }
  return result;
};
