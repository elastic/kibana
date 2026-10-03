/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { INDICATOR_MATCH_THREAT_INDEX_SIZE_EVENT } from '../../../../telemetry/event_based/events';

/**
 * Reports, per Indicator Match execution, how large the threat-indicator side is (and the event side,
 * plus the threat-mapping shape), to size a native ES|QL migration.
 *
 * The threat-index size is the unfiltered doc count of the threat index pattern (what a native
 * implementation would hold in a single-shard lookup index). It is a match_all count answered from
 * per-segment doc counts, so it is cheap and uses the read access the rule already has on the index.
 *
 * Telemetry must never crash or interfere with the rule run, so everything here is best-effort: a
 * failure logs at debug and skips the event.
 */
export const reportIndicatorMatchTelemetry = async ({
  analytics,
  logger,
  esClient,
  threatIndex,
  isElasticRule,
  threatIndicatorCount,
  threatMapping,
}: {
  analytics?: AnalyticsServiceSetup;
  logger: { debug: (message: string) => void };
  esClient: ElasticsearchClient;
  threatIndex: string[];
  isElasticRule: boolean;
  threatIndicatorCount: number;
  threatMapping: ThreatMapping;
}): Promise<void> => {
  // No work when telemetry is off: skip the count query entirely.
  if (!analytics) {
    return;
  }
  try {
    const threatIndexTotalDocCount = (
      await esClient.count({ index: threatIndex, ignore_unavailable: true })
    ).count;
    const threatMappingGroupCount = threatMapping.length;
    const maxFieldsPerThreatMappingGroup = threatMapping.reduce(
      (max, group) => Math.max(max, group.entries.length),
      0
    );
    analytics.reportEvent(INDICATOR_MATCH_THREAT_INDEX_SIZE_EVENT.eventType, {
      isElasticRule,
      threatIndexTotalDocCount,
      threatIndicatorCount,
      threatMappingGroupCount,
      maxFieldsPerThreatMappingGroup,
    });
  } catch (error) {
    logger.debug(`Failed to send Indicator Match threat index size telemetry event: ${error}`);
  }
};
