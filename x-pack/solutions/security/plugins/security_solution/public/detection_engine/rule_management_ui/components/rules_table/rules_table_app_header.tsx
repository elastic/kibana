/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { useRulesTableHeaderTabs } from './use_rules_table_header_tabs';

interface RulesTableAppHeaderProps {
  title: string;
  menu: AppMenuConfig;
  showAddIntegrations: boolean;
}

/**
 * Renders the rules management app header with its tabs. Kept as a child of
 * `RulesTableContextProvider` so the tab hook's route/location subscriptions re-render only this
 * component, and never the provider — which would otherwise re-trigger the rules table URL sync
 * effect and cause an infinite update loop.
 */
export const RulesTableAppHeader = React.memo<RulesTableAppHeaderProps>(
  ({ title, menu, showAddIntegrations }) => {
    const tabs = useRulesTableHeaderTabs();

    return (
      <AppHeader
        title={title}
        menu={menu}
        tabs={tabs}
        padding={{ bleed: 'l' }}
        showAddIntegrations={showAddIntegrations}
      />
    );
  }
);

RulesTableAppHeader.displayName = 'RulesTableAppHeader';
