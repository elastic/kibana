/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { bulkUpdateEntities } from '@kbn/entity-store/public';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { applyEntityStoreSearchCachePatch } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useKibana } from '../../../common/lib/kibana';
import type { Entity } from '../../../../common/api/entity_analytics';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

const ASSET_CRITICALITY_UPDATE_ERROR = i18n.translate(
  'xpack.securitySolution.entityDetails.entityPanel.assetCriticalityError',
  {
    defaultMessage: 'Unable to update asset criticality',
  }
);
export const useUpdateAssetCriticality = (
  entityType: 'user' | 'host' | 'service',
  { onSuccess }: { onSuccess: () => void }
) => {
  const { addError } = useAppToasts();
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const updateAssetCriticalityRecord = useCallback(
    async (updatedRecord: Entity) => {
      const entityIdToUpdate = updatedRecord.entity?.id;
      const updatedAssetCriticality = updatedRecord.asset?.criticality ?? null;

      if (!entityIdToUpdate) {
        addError(new Error('Entity ID is undefined.'), { title: ASSET_CRITICALITY_UPDATE_ERROR });
        return;
      }

      try {
        await bulkUpdateEntities(http, {
          entityType,
          body: {
            entity: { id: entityIdToUpdate },
            asset: {
              criticality: updatedAssetCriticality,
            },
          },
          force: true,
        });
        applyEntityStoreSearchCachePatch(
          queryClient,
          entityType,
          updatedRecord as EntityStoreRecord
        );
        onSuccess();
      } catch (error) {
        addError(error, { title: ASSET_CRITICALITY_UPDATE_ERROR });
      }
    },
    [addError, http, queryClient, entityType, onSuccess]
  );

  const updateAssetCriticalityLevel = useCallback(
    async (level: CriticalityLevelWithUnassigned, record?: EntityStoreRecord | null) => {
      const updatedAssetCriticality = level === 'unassigned' ? null : level;

      if (!record) {
        addError(new Error('Entity ID is undefined.'), { title: ASSET_CRITICALITY_UPDATE_ERROR });
        return;
      }

      const updatedRecord = {
        ...record,
        asset: {
          ...record.asset,
          criticality: updatedAssetCriticality,
        },
      };

      await updateAssetCriticalityRecord(updatedRecord as Entity);
    },
    [addError, updateAssetCriticalityRecord]
  );

  return { updateAssetCriticalityLevel, updateAssetCriticalityRecord };
};
