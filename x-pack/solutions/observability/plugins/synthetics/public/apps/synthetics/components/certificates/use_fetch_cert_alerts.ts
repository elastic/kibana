/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ESSearchResponse } from '@kbn/es-types';
import { SYNTHETICS_TLS_RULE } from '../../../../../common/constants/synthetics_alerts';
import { CERT_HASH_SHA256 } from '../../../../../common/field_names';
import type { ClientPluginsStart } from '../../../../plugin';

export type CertAlertStatus = 'expired' | 'expiring' | 'aging' | 'unknown';

export interface CertAlertInfo {
  count: number;
  status: CertAlertStatus;
}

interface CertAlertsBucket {
  key: string;
  doc_count: number;
  latest_reason: {
    hits: {
      hits: Array<{ _source: { 'kibana.alert.reason'?: string } }>;
    };
  };
}

const parseAlertStatus = (reason?: string): CertAlertStatus => {
  if (!reason) return 'unknown';
  if (reason.includes('has expired')) return 'expired';
  if (reason.includes('is expiring soon')) return 'expiring';
  if (reason.includes('is becoming too old')) return 'aging';
  return 'unknown';
};

export const useFetchCertAlerts = (certSha256List: string[]) => {
  const { http } = useKibana<ClientPluginsStart>().services;

  const sha256Key = useMemo(
    () => [...certSha256List].sort().join(','),
    [certSha256List]
  );

  const { loading, data } = useFetcher(async () => {
    if (certSha256List.length === 0) {
      return undefined;
    }
    return await http.post<ESSearchResponse>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
      body: JSON.stringify({
        rule_type_ids: [SYNTHETICS_TLS_RULE],
        consumers: [AlertConsumers.UPTIME, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY],
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'kibana.alert.status': 'active',
                },
              },
              {
                terms: {
                  [CERT_HASH_SHA256]: certSha256List,
                },
              },
            ],
          },
        },
        aggs: {
          certs_with_alerts: {
            terms: {
              field: CERT_HASH_SHA256,
              size: 100,
            },
            aggs: {
              latest_reason: {
                top_hits: {
                  size: 1,
                  sort: [{ '@timestamp': { order: 'desc' } }],
                  _source: ['kibana.alert.reason'],
                },
              },
            },
          },
        },
      }),
    });
  }, [sha256Key, http]);

  const alertsByCert = useMemo(() => {
    const map = new Map<string, CertAlertInfo>();
    const buckets =
      (data?.aggregations?.certs_with_alerts as { buckets?: CertAlertsBucket[] })?.buckets ?? [];
    for (const bucket of buckets) {
      const reason = bucket.latest_reason?.hits?.hits?.[0]?._source?.['kibana.alert.reason'];
      map.set(bucket.key, {
        count: bucket.doc_count,
        status: parseAlertStatus(reason),
      });
    }
    return map;
  }, [data]);

  return { loading, alertsByCert };
};
