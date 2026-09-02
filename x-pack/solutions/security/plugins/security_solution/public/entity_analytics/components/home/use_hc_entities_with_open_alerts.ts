/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import { useKibana } from '../../../common/lib/kibana';
import { useRiskEngineStatus } from '../../api/hooks/use_risk_engine_status';
import { getEntitiesAlias, ENTITY_LATEST } from './constants';

// Open-alert index — space-unaware, all spaces share the default tier.
const ALERTS_INDEX = '.alerts-security.alerts-default';

// Derives entity.name and entity.EngineMetadata.Type from alert fields so the
// LOOKUP JOIN keys match the entity-latest index schema.
const buildQuery = (entityLatestIndex: string): string =>
  [
    `FROM ${ALERTS_INDEX}`,
    `| WHERE kibana.alert.workflow_status == "open"`,
    `| EVAL \`entity.name\` = COALESCE(user.name, host.name, service.name),`,
    `       \`entity.EngineMetadata.Type\` = CASE(`,
    `         user.name IS NOT NULL, "user",`,
    `         host.name IS NOT NULL, "host",`,
    `         "service"`,
    `       )`,
    `| WHERE \`entity.name\` IS NOT NULL`,
    `| LOOKUP JOIN ${entityLatestIndex} ON \`entity.name\`, \`entity.EngineMetadata.Type\``,
    `| WHERE entity.risk.calculated_level IN ("High", "Critical")`,
    `| STATS value = COUNT_DISTINCT(entity.id)`,
  ].join('\n');

export const useHcEntitiesWithOpenAlerts = ({
  spaceId,
  skip,
}: {
  spaceId: string;
  skip?: boolean;
}) => {
  const { data } = useKibana().services;

  const entityLatestIndex = getEntitiesAlias(ENTITY_LATEST, spaceId);
  const query = useMemo(() => buildQuery(entityLatestIndex), [entityLatestIndex]);

  const { data: riskEngineStatus, isFetching: isStatusLoading } = useRiskEngineStatus();

  const isEnabled =
    !skip && !isStatusLoading && riskEngineStatus?.risk_engine_status !== 'NOT_INSTALLED';

  const queryKey = useMemo(() => ['hcEntitiesWithOpenAlerts', query], [query]);

  const {
    data: result,
    isLoading,
    isRefetching,
    error,
  } = useQuery<number, SecurityAppError>(
    queryKey,
    async ({ signal }) => {
      const searchResult = await lastValueFrom(
        data.search.search(
          { params: { query } },
          {
            abortSignal: signal,
            strategy: 'esql_async',
            projectRouting: '_alias:_origin',
          }
        )
      );

      const rawResponse = searchResult.rawResponse as unknown as ESQLSearchResponse;
      const row = rawResponse.values?.[0];
      const valueIndex = rawResponse.columns?.findIndex((c) => c.name === 'value') ?? 0;
      return typeof row?.[valueIndex] === 'number' ? (row[valueIndex] as number) : 0;
    },
    {
      keepPreviousData: true,
      enabled: isEnabled,
      retry: 1,
    }
  );

  // Suppress "Unknown index" errors while the entity-latest index is still being created.
  const filteredError = error?.message?.includes('Unknown index') ? undefined : error;

  useErrorToast(
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.home.hcEntitiesWithOpenAlerts.queryError',
      { defaultMessage: 'There was an error loading H/C entities with open alerts' }
    ),
    filteredError
  );

  return {
    count: result ?? 0,
    isLoading: isLoading || isRefetching || isStatusLoading,
    error,
  };
};
