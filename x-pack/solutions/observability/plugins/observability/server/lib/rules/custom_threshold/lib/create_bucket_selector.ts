/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToBuiltInComparators } from '../../../../../common';
import type { CustomMetricExpressionParams } from '../../../../../common/custom_threshold_rule/types';
import { createConditionScript } from './create_condition_script';
import { createLastPeriod } from './wrap_in_period';

const EMPTY_SHOULD_WARN = {
  bucket_script: {
    buckets_path: {},
    script: '0',
  },
};

export const createBucketSelector = (
  condition: CustomMetricExpressionParams,
  alertOnGroupDisappear: boolean = false,
  timeFieldName: string,
  groupBy?: string | string[],
  lastPeriodEnd?: number
) => {
  const hasGroupBy = !!groupBy;
  const hasWarn = condition.warningThreshold != null && condition.warningComparator != null;
  const bucketPath = "currentPeriod['all']>aggregatedValue";

  const shouldWarn = hasWarn
    ? {
        bucket_script: {
          buckets_path: {
            value: bucketPath,
          },
          script: createConditionScript(
            condition.warningThreshold as number[],
            convertToBuiltInComparators(condition.warningComparator!)
          ),
        },
      }
    : EMPTY_SHOULD_WARN;

  const shouldTrigger = {
    bucket_script: {
      buckets_path: {
        value: bucketPath,
      },
      script: createConditionScript(
        condition.threshold,
        convertToBuiltInComparators(condition.comparator)
      ),
    },
  };

  const aggs: any = {
    shouldWarn,
    shouldTrigger,
  };

  if (hasGroupBy && alertOnGroupDisappear && lastPeriodEnd) {
    const wrappedPeriod = createLastPeriod(lastPeriodEnd, condition, timeFieldName);
    aggs.lastPeriod = wrappedPeriod.lastPeriod;
    aggs.missingGroup = {
      bucket_script: {
        buckets_path: {
          lastPeriod: 'lastPeriod>_count',
          currentPeriod: "currentPeriod['all']>_count",
        },
        script: 'params.lastPeriod > 0 && params.currentPeriod < 1 ? 1 : 0',
      },
    };
    aggs.newOrRecoveredGroup = {
      bucket_script: {
        buckets_path: {
          lastPeriod: 'lastPeriod>_count',
          currentPeriod: "currentPeriod['all']>_count",
        },
        script: 'params.lastPeriod < 1 && params.currentPeriod > 0 ? 1 : 0',
      },
    };
  }

  if (hasGroupBy) {
    const evalutionBucketPath =
      alertOnGroupDisappear && lastPeriodEnd
        ? {
            shouldWarn: 'shouldWarn',
            shouldTrigger: 'shouldTrigger',
            missingGroup: 'missingGroup',
            newOrRecoveredGroup: 'newOrRecoveredGroup',
          }
        : { shouldWarn: 'shouldWarn', shouldTrigger: 'shouldTrigger' };

    const evaluationScript =
      alertOnGroupDisappear && lastPeriodEnd
        ? '(params.missingGroup != null && params.missingGroup > 0) || (params.shouldWarn != null && params.shouldWarn > 0) || (params.shouldTrigger != null && params.shouldTrigger > 0) || (params.newOrRecoveredGroup != null && params.newOrRecoveredGroup > 0)'
        : '(params.shouldWarn != null && params.shouldWarn > 0) || (params.shouldTrigger != null && params.shouldTrigger > 0)';

    aggs.evaluation = {
      bucket_selector: {
        buckets_path: evalutionBucketPath,
        script: evaluationScript,
      },
    };
  }

  return aggs;
};
