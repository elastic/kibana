/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import type { NoisyRuleOutput } from '../../../common/workflows/steps';
import { noisyRuleStepCommonDefinition } from '../../../common/workflows/steps';

const DEFAULT_TIME_RANGE = 'now-1h';
const DEFAULT_THRESHOLD = 100;
const CANDIDATE_RULES_SIZE = 10;

interface RuleBucket {
  key: string;
  doc_count: number;
  sample: { hits?: { hits?: Array<{ _source?: Record<string, unknown> }> } };
}

export const noisyRuleStepDefinition = createServerStepDefinition({
  ...noisyRuleStepCommonDefinition,
  handler: async (context) => {
    const { timeRange = DEFAULT_TIME_RANGE, threshold = DEFAULT_THRESHOLD, index } = context.input;
    const esClient = context.contextManager.getScopedEsClient();

    const spaceId = context.contextManager.getContext().workflow?.spaceId ?? 'default';
    const alertsIndex = index ?? `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

    try {
      const result = await esClient.search({
        index: alertsIndex,
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: timeRange } } },
              { term: { 'kibana.alert.workflow_status': 'open' } },
            ],
          },
        },
        aggs: {
          by_rule: {
            terms: {
              field: 'kibana.alert.rule.uuid',
              size: CANDIDATE_RULES_SIZE,
              order: { _count: 'desc' },
            },
            aggs: {
              sample: {
                top_hits: { size: 1, _source: ['kibana.alert.rule.name'] },
              },
            },
          },
        },
        ignore_unavailable: true,
      });

      const buckets = (result.aggregations?.by_rule as { buckets?: RuleBucket[] })?.buckets;

      if (!buckets || buckets.length === 0) {
        context.logger.info('No alerts found in the time range');
        return { output: { found: false, alert_count: 0 } };
      }

      const match = await findFirstExistingRule(esClient, buckets, threshold, context.logger);

      if (!match) {
        context.logger.info('No existing rule above threshold found');
        return { output: { found: false, alert_count: 0 } };
      }

      return { output: match };
    } catch (error) {
      context.logger.error(
        'Failed to aggregate alerts by rule',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to aggregate security alerts'
        ),
      };
    }
  },
});

type EsClient = ReturnType<StepContextManager['getScopedEsClient']>;
type StepContextManager = Parameters<
  Parameters<typeof createServerStepDefinition>[0]['handler']
>[0]['contextManager'];
type StepLogger = Parameters<
  Parameters<typeof createServerStepDefinition>[0]['handler']
>[0]['logger'];

const checkRuleExists = async (esClient: EsClient, ruleId: string): Promise<boolean> => {
  try {
    return await esClient.exists({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `alert:${ruleId}`,
    });
  } catch {
    return false;
  }
};

const findFirstExistingRule = async (
  esClient: EsClient,
  buckets: RuleBucket[],
  threshold: number,
  logger: StepLogger
): Promise<NoisyRuleOutput | undefined> => {
  for (const bucket of buckets) {
    const alertCount = bucket.doc_count ?? 0;
    if (alertCount < threshold) {
      logger.info('Remaining candidates below threshold', { alertCount, threshold });
      return undefined;
    }

    const ruleId = bucket.key;
    if (!(await checkRuleExists(esClient, ruleId))) {
      logger.info('Rule no longer exists, skipping', { ruleId });
    } else {
      const ruleName =
        (bucket.sample?.hits?.hits?.[0]?._source?.['kibana.alert.rule.name'] as string) ??
        'unknown';
      logger.info('Noisiest existing rule found', { ruleId, ruleName, alertCount, threshold });
      return { found: true, rule_id: ruleId, rule_name: ruleName, alert_count: alertCount };
    }
  }

  return undefined;
};
