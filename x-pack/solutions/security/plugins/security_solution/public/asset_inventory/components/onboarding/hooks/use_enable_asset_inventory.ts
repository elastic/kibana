/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { AssetInventoryServerApiError } from '../../../../../common/api/asset_inventory/types';
import { useInstallEntityStoreMutation } from '../../../../entity_analytics/components/entity_store/hooks/use_entity_store';
import { useAssetInventoryRoutes } from '../../../hooks/use_asset_inventory_routes';
import { useAssetInventoryStatus } from '../../../hooks/use_asset_inventory_status';
import { useOnboardingSuccessCallout } from './use_onboarding_success_callout';

/**
 * Hook with related business logic for enabling Asset Inventory.
 *
 * Asset Inventory now relies entirely on the Entity Store v2 lifecycle. Enabling triggers:
 * 1. POST /api/security/entity_store/install (all 4 entity types via the shared mutation),
 * 2. POST /api/asset_inventory/install_data_view (creates the per-space data view and
 *    bootstraps asset criticality resources required by the entity store transforms).
 */
export const useEnableAssetInventory = () => {
  const { mutateAsync: installEntityStore } = useInstallEntityStoreMutation();
  const { postInstallAssetInventoryDataView } = useAssetInventoryRoutes();
  const { refetch: refetchStatus } = useAssetInventoryStatus();
  const { showOnboardingSuccessCallout } = useOnboardingSuccessCallout();

  const mutation = useMutation<unknown, AssetInventoryServerApiError>(
    async () => {
      await installEntityStore();
      await postInstallAssetInventoryDataView();
    },
    {
      onSuccess: () => {
        showOnboardingSuccessCallout();
        refetchStatus();
      },
    }
  );

  const errorMessage =
    mutation.error?.body?.message ||
    i18n.translate('xpack.securitySolution.assetInventory.onboarding.enableAssetInventory.error', {
      defaultMessage: 'Failed to enable Asset Inventory. Please try again.',
    });

  // isEnabling is true when the mutation is loading and after it has succeeded so that the UI
  // can show a loading spinner while the status is being re-fetched
  const isEnabling = mutation.isLoading || mutation.isSuccess;

  return {
    isEnabling,
    error: mutation.isError ? errorMessage : null,
    reset: mutation.reset,
    enableAssetInventory: () => mutation.mutate(),
  };
};
