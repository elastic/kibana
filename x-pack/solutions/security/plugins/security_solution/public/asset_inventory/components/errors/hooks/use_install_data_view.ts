/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type {
  AssetInventoryInstallDataViewResponse,
  AssetInventoryServerApiError,
} from '../../../../../common/api/asset_inventory/types';
import { useAssetInventoryRoutes } from '../../../hooks/use_asset_inventory_routes';

/**
 * Hook with related business logic for installing Asset Inventory data view
 */
export const useInstallDataView = ({ callback }: { callback?: () => void } = {}) => {
  const { postInstallAssetInventoryDataView } = useAssetInventoryRoutes();

  const mutation = useMutation<AssetInventoryInstallDataViewResponse, AssetInventoryServerApiError>(
    postInstallAssetInventoryDataView,
    {
      onSuccess: () => {
        callback?.();
      },
    }
  );

  const errorMessage =
    mutation.error?.body?.message ||
    i18n.translate('xpack.securitySolution.assetInventory.onboarding.installDataView.error', {
      defaultMessage: 'Failed to install Asset Inventory data view. Please try again.',
    });

  // isInstalling is true when the mutation is loading and after it has succeeded so that the UI
  // can show a loading spinner while the status is being re-fetched
  const isInstalling = mutation.isLoading || mutation.isSuccess;

  return {
    isInstalling,
    error: mutation.isError ? errorMessage : null,
    reset: mutation.reset,
    installDataView: () => mutation.mutate(),
  };
};
