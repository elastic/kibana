/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';

const CONTRIBUTING_ALERT_FIELDS = [
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.reason',
  '@timestamp',
  'process.name',
  'process.executable',
  'source.ip',
  'destination.ip',
  'user.name',
  'host.name',
  'event.action',
  'event.category',
  'file.name',
  'file.path',
] as const;

export interface ContributingAlert {
  id: string;
  ruleName: string;
  severity: string;
  riskScore: number;
  reason: string;
  timestamp: string;
  fields: Record<string, unknown>;
}

export interface UseContributingAlertParams {
  /**
   * UUID of the contributing (original) alert referenced by the correlation building block
   */
  originalAlertUuid: string | undefined;
}

export interface UseContributingAlertResult {
  loading: boolean;
  error: boolean;
  contributingAlert: ContributingAlert | undefined;
}

const buildContributingAlertQuery = (alertUuid: string) => ({
  size: 1,
  _source: CONTRIBUTING_ALERT_FIELDS as unknown as string[],
  query: {
    bool: {
      must: {
        term: {
          'kibana.alert.uuid': alertUuid,
        },
      },
    },
  },
});

const EMPTY_QUERY = {};

/**
 * Fetches the contributing (original) alert for a correlation building block alert.
 * Uses the same useQueryAlerts pattern as the rest of the flyout.
 */
export const useContributingAlert = ({
  originalAlertUuid,
}: UseContributingAlertParams): UseContributingAlertResult => {
  const skip = !originalAlertUuid;

  const query = useMemo(
    () => (originalAlertUuid ? buildContributingAlertQuery(originalAlertUuid) : EMPTY_QUERY),
    [originalAlertUuid]
  );

  const { loading, data } = useQueryAlerts<Record<string, unknown>, never>({
    query,
    skip,
    queryName: ALERTS_QUERY_NAMES.CONTRIBUTING_ALERT,
  });

  const contributingAlert = useMemo(() => {
    if (!data?.hits?.hits?.[0] || !originalAlertUuid) {
      return undefined;
    }

    const hit = data.hits.hits[0];
    const source = (hit._source ?? {}) as Record<string, unknown>;

    const getNestedField = (field: string): unknown => {
      const parts = field.split('.');
      let current: unknown = source;
      for (const part of parts) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
      }
      return current;
    };

    return {
      id: originalAlertUuid,
      ruleName: (getNestedField('kibana.alert.rule.name') as string) ?? 'Unknown',
      severity: (getNestedField('kibana.alert.severity') as string) ?? 'unknown',
      riskScore: (getNestedField('kibana.alert.risk_score') as number) ?? 0,
      reason: (getNestedField('kibana.alert.reason') as string) ?? '',
      timestamp: (getNestedField('@timestamp') as string) ?? '',
      fields: Object.fromEntries(
        (CONTRIBUTING_ALERT_FIELDS as readonly string[])
          .filter((f) => getNestedField(f) !== undefined)
          .map((f) => [f, getNestedField(f)])
      ),
    };
  }, [data, originalAlertUuid]);

  const error = !loading && !skip && !contributingAlert && data != null;

  return useMemo(
    () => ({ loading, error, contributingAlert }),
    [loading, error, contributingAlert]
  );
};
