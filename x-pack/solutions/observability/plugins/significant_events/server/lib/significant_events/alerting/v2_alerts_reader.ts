/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { toEsqlRequest } from '../../streams/esql';
import {
  RULES_BUCKET_SIZE,
  METRIC_SERIES_RUNTIME_MAPPINGS,
  buildChangePointHistogramWindow,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';
import {
  RULE_EVENTS_INDEX,
  buildRuleEventsSignalFilter,
  projectMetricSeriesColumns,
} from './rule_events_metric_series';
import type {
  ChangePointRuleBucket,
  ChangePointTypeMap,
  ChangePointScanParams,
  CountDetectionAlertsParams,
  RuleMetadata,
} from './alerts_reader';
import {
  type ISignificantEventsAlertsReader,
  type OccurrencesEsqlParams,
  buildRuleMetadataMap,
} from './alerts_reader';

const EMPTY_CHANGE_POINT_TYPE: ChangePointTypeMap = {};

/**
 * Returned when the series is too short to judge — most often a rule that has
 * not been reporting long enough to fill the window. Carries `reason` instead
 * of `p_value`, and must not reach the Detection workflow, which would treat it
 * as an observed type and write it as a transition.
 */
const INDETERMINABLE_CHANGE_POINT_TYPE = 'indeterminable';

interface RawRuleBucket {
  key: string;
  doc_count: number;
  change_points?: { type?: ChangePointTypeMap };
}

function hitsTotal(total: number | { value: number } | undefined): number {
  if (total == null) {
    return 0;
  }
  return typeof total === 'number' ? total : total.value;
}

export class SignificantEventsAlertsReaderV2 implements ISignificantEventsAlertsReader {
  readonly index = RULE_EVENTS_INDEX;
  readonly ruleIdColumn = 'rule_id' as const;

  /**
   * Match-document occurrences for the UI: each `metric_value` is COUNT(*) of
   * source docs in a closed minute. MAX collapses overlapping rule re-emits,
   * then SUM folds minutes into the chart interval. The time window is applied
   * to source `bucket` (not write-time `@timestamp`).
   */
  buildOccurrencesEsqlRequest({
    ruleIds,
    value,
    esqlUnit,
    limit,
    spaceId,
    rangeFromIso,
    rangeToIso,
  }: OccurrencesEsqlParams) {
    if (typeof rangeFromIso !== 'string' || typeof rangeToIso !== 'string') {
      throw new Error(
        'buildOccurrencesEsqlRequest requires rangeFromIso and rangeToIso (UTC ISO-8601 strings)'
      );
    }

    const ruleIdLiterals = ruleIds.map((id) => esql.str(id));
    const ruleIdCol = esql.col(['rule', 'id']);
    const typeCol = esql.col('type');
    const spaceIdCol = esql.col('space_id');
    // Same TO_DATETIME(str) pattern as latest_source_query / other SigEvents builders.
    const rangeStart = esql.str(rangeFromIso);
    const rangeEnd = esql.str(rangeToIso);

    const scoped = esql.from([this.index]).where`${typeCol} == ${esql.str(
      'signal'
    )} AND ${spaceIdCol} == ${esql.str(spaceId)} AND ${ruleIdCol} IN (${ruleIdLiterals})`;

    return toEsqlRequest(
      projectMetricSeriesColumns(scoped).pipe`WHERE bucket IS NOT NULL AND metric_value IS NOT NULL`
        .pipe`WHERE bucket >= TO_DATETIME(${rangeStart}) AND bucket <= TO_DATETIME(${rangeEnd})`
        .pipe`STATS minute_value = MAX(metric_value) BY rule_id = ${ruleIdCol}, source_minute = DATE_TRUNC(1 minute, bucket)`
        .pipe`STATS count = SUM(minute_value) BY rule_id, bucket = BUCKET(source_minute, ${esql.num(
        value
      )} ${esql.kwd(esqlUnit)})`.pipe`SORT bucket ASC`.pipe`LIMIT ${esql.num(limit)}`
    );
  }

  async countAlerts(
    esClient: TracedElasticsearchClient,
    { lookback, spaceId, ruleUuid }: CountDetectionAlertsParams
  ): Promise<number> {
    // The idle gate only needs "any activity" (> 0), so avoid exact-counting the
    // full window: `terminate_after: 1` stops each shard after its first match and
    // `track_total_hits: 1` caps the tracked total (0 stays 0, any match reads >= 1).
    const response = await esClient.search('significant_events_alerts_v2_count_alerts', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: buildRuleEventsSignalFilter({ lookback, spaceId, ruleUuid }),
        },
      },
    });

    return hitsTotal(response.hits.total);
  }

  async runChangePointScan(
    esClient: TracedElasticsearchClient,
    params: ChangePointScanParams,
    queryLinks: QueryLink[]
  ) {
    const ruleMetadata = buildRuleMetadataMap(queryLinks);
    const response = await esClient.search('significant_events_alerts_v2_change_point_scan', {
      index: this.index,
      ignore_unavailable: true,
      size: 0,
      track_total_hits: false,
      // Drop the per-bucket `over_time` series from the response: it can be large and is only
      // needed server-side as the buckets_path input for the change_point pipeline agg, not in
      // the payload the Detection workflow consumes.
      filter_path: '-aggregations.by_rule.buckets.over_time',
      ...this.buildChangePointScanBody(params),
    });

    const rawBuckets =
      (response.aggregations?.by_rule as { buckets?: RawRuleBucket[] })?.buckets ?? [];

    return {
      took: response.took,
      by_rule: {
        buckets: rawBuckets.map((bucket) => this.enrichChangePointBucket(bucket, ruleMetadata)),
      },
    };
  }

  private buildChangePointScanBody({
    lookback,
    bucketInterval,
    spaceId,
    ruleIds,
  }: ChangePointScanParams) {
    const { hardBounds, seriesMax, writeTimeLookback } = buildChangePointHistogramWindow(
      lookback,
      bucketInterval
    );

    return {
      runtime_mappings: METRIC_SERIES_RUNTIME_MAPPINGS,
      query: {
        bool: {
          filter: buildRuleEventsSignalFilter({
            lookback: writeTimeLookback,
            spaceId,
            ruleIds,
          }),
        },
      },
      aggs: {
        by_rule: {
          terms: { field: 'rule.id', size: RULES_BUCKET_SIZE },
          aggs: {
            ...buildChangePointTimeSeriesAggs({
              bucketInterval,
              hardBounds,
              seriesMax,
            }),
          },
        },
      },
    };
  }

  private enrichChangePointBucket(
    bucket: RawRuleBucket,
    ruleMetadata: Map<string, RuleMetadata>
  ): ChangePointRuleBucket {
    const meta = ruleMetadata.get(bucket.key);
    const ruleName = meta?.ruleName ?? 'unknown';
    const streamName = meta?.streamName ?? 'unknown';
    const verdict = bucket.change_points?.type ?? EMPTY_CHANGE_POINT_TYPE;

    return {
      key: bucket.key,
      severity_score: meta?.severityScore ?? 0,
      doc_count: bucket.doc_count,
      rule_name: { top: [{ metrics: { 'kibana.alert.rule.name': ruleName } }] },
      stream: { buckets: [{ key: streamName }] },
      change_points: {
        type: INDETERMINABLE_CHANGE_POINT_TYPE in verdict ? EMPTY_CHANGE_POINT_TYPE : verdict,
      },
    };
  }
}
