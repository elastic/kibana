/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// import { AssetInventoryOnboarding } from '../components/onboarding/asset_inventory_onboarding';
import { useDataViewContext } from '../hooks/data_view_context';
import { AllAssets } from './all_assets';

const AssetInventoryPage = () => {
  const { dataView } = useDataViewContext();

  if (!dataView) {
    return null;
  }

  return <AllAssets />;
  // return (
  //   <AssetInventoryOnboarding>
  //     <AllAssets />
  //   </AssetInventoryOnboarding>
  // );
};

AssetInventoryPage.displayName = 'AssetInventoryPage';

// eslint-disable-next-line import/no-default-export
export default AssetInventoryPage;
