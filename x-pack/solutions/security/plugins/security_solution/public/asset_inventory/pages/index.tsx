/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { AssetInventoryLazyWrapper } from '../methods';

export const AssetInventoryContainer = React.memo(() => {
  return (
    <SecuritySolutionPageWrapper noPadding>
      <AssetInventoryLazyWrapper />
      <SpyRoute pageName={SecurityPageName.assetInventory} />
    </SecuritySolutionPageWrapper>
  );
});

AssetInventoryContainer.displayName = 'AssetInventoryContainer';
