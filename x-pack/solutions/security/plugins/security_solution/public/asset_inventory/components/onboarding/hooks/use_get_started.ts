/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEnableAssetInventory } from './use_enable_asset_inventory';
import { useAssetInventoryContext } from '../../../context';

/**
 * Business logic for the Get Started page
 */
export const useGetStarted = () => {
  const { refetchStatusFn } = useAssetInventoryContext();
  const { isEnabling, error, setError, handleEnableClick } =
    useEnableAssetInventory(refetchStatusFn);

  return {
    isEnabling,
    error,
    setError,
    handleEnableClick,
  };
};
