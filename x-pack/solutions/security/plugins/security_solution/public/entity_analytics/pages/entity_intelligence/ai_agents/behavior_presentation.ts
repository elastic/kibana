/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  BehaviorComparisonStatus,
  BehaviorFinding,
  BehaviorFindingKind,
} from './behavior_types';

export const behaviorLabels: Record<BehaviorFindingKind, string> = {
  new_tool: i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.behavior.newTool', {
    defaultMessage: 'New tool in this baseline',
  }),
  failure_rate_increase: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.behavior.failureRate',
    {
      defaultMessage: 'Failure rate increased',
    }
  ),
  repeated_tool_failures: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.behavior.repeatedFailures',
    {
      defaultMessage: 'Repeated tool failures',
    }
  ),
  tool_volume_increase: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.behavior.volume',
    {
      defaultMessage: 'Observation volume increased',
    }
  ),
  duration_increase: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.behavior.duration',
    {
      defaultMessage: 'Execution duration increased',
    }
  ),
};

export const comparisonLabel = (status: BehaviorComparisonStatus): string => {
  if (status === 'evaluated')
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.behavior.evaluated',
      { defaultMessage: 'Compared' }
    );
  if (status === 'insufficient_baseline')
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.behavior.needBaseline',
      { defaultMessage: 'Needs more baseline data' }
    );
  if (status === 'unavailable_metadata')
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.behavior.noMetadata',
      { defaultMessage: 'Metadata not recorded' }
    );
  if (status === 'incomplete_coverage')
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.behavior.incomplete',
      { defaultMessage: 'Incomplete evidence' }
    );
  return i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.behavior.notEnough', {
    defaultMessage: 'Not enough observations',
  });
};

export const findingDescription = (finding: BehaviorFinding): string => {
  if (finding.kind === 'new_tool')
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.behavior.newToolDetail',
      {
        defaultMessage:
          '{tool} was observed {count, number} {count, plural, one {time} other {times}} and was absent from the {baseline, number} baseline sessions.',
        values: {
          tool: finding.toolName ?? '—',
          count: finding.observed,
          baseline: finding.baselineSampleSize,
        },
      }
    );
  if (finding.kind === 'failure_rate_increase')
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.behavior.rateDetail',
      {
        defaultMessage:
          '{current}% of known outcomes failed, compared with {baseline}% in the baseline. Unknown outcomes are excluded.',
        values: {
          current: Math.round(finding.observed * 100),
          baseline: Math.round((finding.baseline ?? 0) * 100),
        },
      }
    );
  if (finding.kind === 'repeated_tool_failures')
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.behavior.repeatDetail',
      {
        defaultMessage:
          '{count, number} consecutive observed failures for {tool} within the configured time window.',
        values: { count: finding.observed, tool: finding.toolName ?? '—' },
      }
    );
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.behavior.volumeDetail',
    {
      defaultMessage:
        '{current, number} observed, compared with a baseline median of {baseline, number}; the threshold is {threshold, number}.',
      values: {
        current: finding.observed,
        baseline: finding.baseline ?? 0,
        threshold: finding.threshold,
      },
    }
  );
};
