/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useKibana } from '../../common/lib/kibana';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';

export const AssetInventoryContainer = React.memo(() => {
  const { assetInventory } = useKibana().services;

  return (
    <SecuritySolutionPageWrapper noPadding>
      {assetInventory.getAssetInventoryPage({})}
      <SpyRoute pageName={SecurityPageName.assetInventory} />
    </SecuritySolutionPageWrapper>
  );
});

AssetInventoryContainer.displayName = 'AssetInventoryContainer';
