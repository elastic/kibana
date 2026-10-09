/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { isRunningResponse, type DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EntityType as EntityStoreEntityType } from '@kbn/entity-store/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { filter, firstValueFrom } from 'rxjs';
import { EntityRiskQueries } from '../../../../../common/api/search_strategy';
import {
  EntityType as RiskScoreEntityType,
  getRiskIndex,
  type StrategyRequestInputType,
  type StrategyResponseType,
} from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { isIndexNotFoundError } from '../../../../common/utils/exceptions';
import { useEntityStoreRoutes } from '../../../api/entity_store';

interface HasServiceRiskScoresParams {
  search: DataPublicPluginStart['search'];
  spaces?: SpacesPluginStart;
  executionContext?: KibanaExecutionContext;
}

const hasServiceRiskScores = async ({
  search,
  spaces,
  executionContext,
}: HasServiceRiskScoresParams): Promise<boolean> => {
  const spaceId = (await spaces?.getActiveSpace())?.id ?? 'default';
  const request: StrategyRequestInputType<EntityRiskQueries.list> = {
    defaultIndex: [getRiskIndex(spaceId)],
    factoryQueryType: EntityRiskQueries.list,
    pagination: { cursorStart: 0, querySize: 1 },
    riskScoreEntity: RiskScoreEntityType.service,
  };

  try {
    const response = await firstValueFrom(
      search
        .search<
          StrategyRequestInputType<EntityRiskQueries.list>,
          StrategyResponseType<EntityRiskQueries.list>
        >(request, {
          strategy: 'securitySolutionSearchStrategy',
          executionContext,
        })
        .pipe(filter((result) => !isRunningResponse(result)))
    );
    return response.totalCount > 0;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return false;
    }
    throw error;
  }
};

/** Keeps service extraction on reinstall when existing engine state or risk scores show that the space used the previous default. */
export const useShouldInstallServiceEngine = () => {
  const { data, spaces, logger } = useKibana().services;
  const { getEntityStoreStatus } = useEntityStoreRoutes();

  return useCallback(
    async (executionContext?: KibanaExecutionContext): Promise<boolean> => {
      try {
        const [status, serviceRiskScoresExist] = await Promise.all([
          getEntityStoreStatus(false, executionContext),
          hasServiceRiskScores({
            search: data.search,
            spaces,
            executionContext,
          }),
        ]);

        return (
          status.engines.some(({ type }) => type === EntityStoreEntityType.enum.service) ||
          serviceRiskScoresExist
        );
      } catch (error) {
        logger.error(
          'Failed to determine whether to install the service engine. Including service in the install request.'
        );
        logger.error(error instanceof Error ? error : String(error));
        return true;
      }
    },
    [data.search, getEntityStoreStatus, logger, spaces]
  );
};
