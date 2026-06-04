/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { EntityType } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';

import { useKibana } from '../../../../../common/lib/kibana';

interface Params {
  alertIds: string[]; // original (de-anonymized) alert document IDs
  fieldName: string; // e.g. 'host.name' or 'user.name'
  fieldValue: string; // e.g. 'SRVWIN01'
  enabled: boolean; // only fetch when the badge is actually clickable
}

interface Result {
  euid: string | undefined;
  isLoading: boolean;
}

const ENTITY_TYPE_BY_FIELD: Record<string, EntityType> = {
  'host.name': 'host',
  'host.hostname': 'host',
  'user.name': 'user',
};

export const useEntityEuidFromAlerts = ({
  alertIds,
  fieldName,
  fieldValue,
  enabled,
}: Params): Result => {
  const { data } = useKibana().services;
  const euidApi = useEntityStoreEuidApi();
  const [euid, setEuid] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const entityType = ENTITY_TYPE_BY_FIELD[fieldName];

  useEffect(() => {
    if (!enabled || !entityType || alertIds.length === 0 || !euidApi?.euid) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchEuid = async () => {
      try {
        const response = await data.search
          .search({
            params: {
              index: '.alerts-security.alerts-*',
              ignore_unavailable: true,
              body: {
                query: { ids: { values: alertIds } },
                _source: [
                  'host.name',
                  'host.id',
                  'host.hostname',
                  'user.name',
                  'user.id',
                  'user.email',
                  'user.domain',
                  'event.module',
                  'event.kind',
                  'event.category',
                  'event.type',
                  'data_stream.dataset',
                ],
                size: alertIds.length,
              },
            },
          })
          .toPromise();

        if (cancelled) return;

        const hits =
          (response?.rawResponse?.hits?.hits as Array<{
            _source?: Record<string, unknown>;
          }>) ?? [];
        // Find the first alert where the clicked field matches the badge value
        const matchingHit = hits.find((hit) => {
          const src = hit._source ?? {};
          const fieldParts = fieldName.split('.');
          // Support flattened keys (e.g. 'host.name') and nested objects
          const flatValue = src[fieldName];
          const nestedValue = fieldParts.reduce(
            (obj: Record<string, unknown> | undefined, key: string) =>
              (obj?.[key] as Record<string, unknown> | undefined) ?? undefined,
            src
          );
          const val = flatValue ?? nestedValue;
          return val === fieldValue || (Array.isArray(val) && val.includes(fieldValue));
        });

        if (matchingHit) {
          const computed = euidApi.euid.getEuidFromObject(entityType, matchingHit._source);
          if (!cancelled) setEuid(computed);
        }
      } catch {
        // Silently swallow — caller falls back to Observed flyout when euid is undefined
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchEuid();
    return () => {
      cancelled = true;
    };
  }, [alertIds, data.search, euidApi, entityType, fieldName, fieldValue, enabled]);

  return { euid, isLoading };
};
