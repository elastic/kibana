/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type {
  AssetInventoryEnableResponse,
  AssetInventoryServerApiError,
} from '../../../../../common/api/asset_inventory/types';
import { useAssetInventoryRoutes } from '../../../hooks/use_asset_inventory_routes';
import { useAssetInventoryStatus } from '../../../hooks/use_asset_inventory_status';
import { useOnboardingSuccessCallout } from './use_onboarding_success_callout';

/**
 * Hook with related business logic for enabling Asset Inventory
 */
export const useEnableAssetInventory = () => {
  const { postEnableAssetInventory } = useAssetInventoryRoutes();
  const { refetch: refetchStatus } = useAssetInventoryStatus();
  const { showOnboardingSuccessCallout } = useOnboardingSuccessCallout();

  const mutation = useMutation<AssetInventoryEnableResponse, AssetInventoryServerApiError>(
    postEnableAssetInventory,
    {
      onSuccess: () => {
        // ensure the success callout will be visible after enabling Asset Inventory
        showOnboardingSuccessCallout();
        // re-fetch the status API to update the UI
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
