/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { ServerApiError } from '../../../../common/types';
import { useAssetInventoryRoutes } from '../../../hooks/use_asset_inventory_routes';

export const useEnableAssetInventory = (refetchStatusFn: () => void) => {
  const { postEnableAssetInventory } = useAssetInventoryRoutes();
  const [error, setError] = useState<string | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  const mutation = useMutation(postEnableAssetInventory, {
    onMutate: () => {
      setIsEnabling(true);
      setError(null);
    },
    onSuccess: () => {
      refetchStatusFn();
    },
    onError: (err: { body?: ServerApiError }) => {
      const errorMessage =
        err?.body?.message ||
        i18n.translate(
          'xpack.securitySolution.assetInventory.onboarding.enableAssetInventory.error',
          {
            defaultMessage: 'Failed to enable Asset Inventory. Please try again.',
          }
        );
      setError(errorMessage);
      setIsEnabling(false);
    },
  });

  return {
    isEnabling,
    error,
    setError,
    handleEnableClick: () => mutation.mutate(),
  };
};
