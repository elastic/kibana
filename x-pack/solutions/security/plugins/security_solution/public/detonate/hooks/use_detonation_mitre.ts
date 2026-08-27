/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { ALERT_BUILDING_BLOCK_TYPE } from '@kbn/rule-data-utils';

import type {
  DetonationThreatBucket,
  MitreTacticSummary,
  RawThreatBlock,
} from '../../../common/detonate';
import { mergeThreatBlocks } from '../../../common/detonate';
import { ALERTS_QUERY_NAMES } from '../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../detections/containers/detection_engine/alerts/use_query';

/**
 * ATT&CK reaches an alert through two fields: `threat`, copied from the endpoint behavior rule that
 * fired, and `kibana.alert.rule.threat`, the detection rule's own mapping. Both carry the same ECS
 * shape, so they are merged together rather than treated as separate sources.
 */
const ECS_THREAT_FIELD = 'threat';
const RULE_THREAT_FIELD = 'kibana.alert.rule.threat';

/** Bounds the aggregation. Detonations run in the tens of rules, well inside this. */
const MAX_RULES = 50;

interface ThreatSource {
  [ECS_THREAT_FIELD]?: RawThreatBlock[];
  [RULE_THREAT_FIELD]?: RawThreatBlock[];
}

interface DetonationMitreAggs {
  byRule: {
    buckets: Array<{
      key: string;
      doc_count: number;
      sample: { hits: { hits: Array<{ _source?: ThreatSource }> } };
    }>;
  };
}

/**
 * The ATT&CK tactics a single detonation exercised, merged across every rule that alerted on it.
 *
 * The mappings are read one alert per rule instead of from the alerts themselves. Every alert a
 * rule produces repeats that rule's mapping, and half of the mapped rules name more than one
 * tactic, so aggregating the keyword fields directly would cross tactics with techniques that never
 * appeared together. Each bucket's `doc_count` supplies the alert count for its part of the tree.
 *
 * Building block alerts are excluded, matching both the alerts table on this page and the Alerts
 * page a count badge pivots to, so the numbers shown are the numbers that pivot resolves to.
 */
export const useDetonationMitre = ({
  agentId,
  skip,
}: {
  agentId: string | null;
  skip?: boolean;
}) => {
  const { loading, data, setQuery } = useQueryAlerts<unknown, DetonationMitreAggs>({
    query: {},
    queryName: ALERTS_QUERY_NAMES.DETONATION_MITRE,
    skip: skip || !agentId,
  });

  // `useQueryAlerts` seeds its query once and refetches only through `setQuery`, so the agent id
  // has to be pushed in when the detonation resolves rather than passed as the initial query.
  useEffect(() => {
    if (!agentId) {
      return;
    }

    setQuery({
      query: {
        bool: {
          filter: [{ term: { 'agent.id': agentId } }],
          must_not: [{ exists: { field: ALERT_BUILDING_BLOCK_TYPE } }],
          should: [
            { exists: { field: `${ECS_THREAT_FIELD}.tactic.name` } },
            { exists: { field: RULE_THREAT_FIELD } },
          ],
          minimum_should_match: 1,
        },
      },
      size: 0,
      aggs: {
        byRule: {
          terms: { field: 'kibana.alert.rule.name', size: MAX_RULES },
          aggs: {
            sample: {
              top_hits: { size: 1, _source: [ECS_THREAT_FIELD, RULE_THREAT_FIELD] },
            },
          },
        },
      },
    });
  }, [agentId, setQuery]);

  const tactics = useMemo<MitreTacticSummary[]>(() => {
    const buckets = data?.aggregations?.byRule?.buckets ?? [];

    const threatBuckets = buckets.map<DetonationThreatBucket>((bucket) => {
      const source = bucket.sample?.hits?.hits?.[0]?._source ?? {};
      return {
        alertCount: bucket.doc_count,
        threats: [...(source[ECS_THREAT_FIELD] ?? []), ...(source[RULE_THREAT_FIELD] ?? [])],
      };
    });

    return mergeThreatBlocks(threatBuckets);
  }, [data]);

  // Between the agent id arriving and the fetch starting the hook reports neither loading nor data.
  // The panel hides itself when there are no tactics, so without this it would pop in late.
  const isLoading = loading || (Boolean(agentId) && !skip && data === null);

  return { tactics, isLoading };
};
