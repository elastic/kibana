/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { OverviewTab } from '../../flyout_v2/document/tabs/overview_tab';

export const AlertFlyoutOverviewTab = memo(({ hit }: { hit: DataTableRecord }) => {
  return <OverviewTab hit={hit} />;
});

AlertFlyoutOverviewTab.displayName = 'AlertFlyoutOverviewTab';
