/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { useEffect, useState } from 'react';
import type { EntityType } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';

import { DEFAULT_ALERTS_INDEX } from '../../../../../../common/constants';
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

export const ENTITY_TYPE_BY_FIELD: Record<string, EntityType> = {
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
  const getEuidRuntimeMapping = euidApi?.euid?.painless?.getEuidRuntimeMapping;
  const [euid, setEuid] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const entityType = ENTITY_TYPE_BY_FIELD[fieldName];

  useEffect(() => {
    if (!enabled || !entityType || alertIds.length === 0 || !getEuidRuntimeMapping) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const fetchEuid = async () => {
      try {
        const response = await lastValueFrom(
          data.search.search({
            params: {
              index: `${DEFAULT_ALERTS_INDEX}-*`,
              ignore_unavailable: true,
              body: {
                query: { ids: { values: alertIds } },
                _source: false,
                runtime_mappings: {
                  entity_id: getEuidRuntimeMapping(entityType),
                },
                fields: ['entity_id', fieldName],
                size: alertIds.length,
              },
            },
          })
        );

        if (cancelled) return;

        const hits =
          (response?.rawResponse?.hits?.hits as Array<{
            fields?: { entity_id?: string[]; [key: string]: unknown };
          }>) ?? [];
        // Find the first alert where the clicked field matches the badge value
        const matchingHit = hits.find((hit) => {
          const val = hit.fields?.[fieldName];
          return val === fieldValue || (Array.isArray(val) && val.includes(fieldValue));
        });

        if (matchingHit) {
          const computed = matchingHit.fields?.entity_id?.[0];
          if (!cancelled && computed) setEuid(computed);
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
  }, [alertIds, data.search, getEuidRuntimeMapping, entityType, fieldName, fieldValue, enabled]);

  return { euid, isLoading };
};
