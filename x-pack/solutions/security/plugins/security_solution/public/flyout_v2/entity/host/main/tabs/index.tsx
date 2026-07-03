/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import type { EntityPanelTabType } from '../../../../../flyout/entity_details/shared/components/entity_panel_tabs';
import { TABLE_TAB_ID } from '../../../../../flyout/entity_details/shared/hooks/use_entity_panel_tabs';
import { EntityStoreTableTab } from '../../../../../flyout/entity_details/shared/components/entity_store_table_tab';
import type { EntityStoreRecord } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { OverviewTab, type OverviewTabProps } from './overview_tab';

export interface HostTabType extends EntityPanelTabType {
  /** Content rendered when this tab is selected. */
  content: ReactElement;
}

export interface GetTabsDisplayedOptions {
  /**
   * Tab definitions (id + name) from `useEntityPanelTabs`. The set of tabs is entity-store driven,
   * so this is only non-empty when the host is in the entity store.
   */
  entityPanelTabs: EntityPanelTabType[];
  /**
   * Entity store record backing the Table tab. When absent the Table tab is not shown by
   * `useEntityPanelTabs`, so this is only used to render the Table tab's content.
   */
  entityStoreRecord: EntityStoreRecord | null;
  /**
   * Props forwarded to the Overview tab content.
   */
  overviewTabProps: OverviewTabProps;
}

/**
 * Maps the entity-panel tab definitions to their rendered content for the host flyout:
 * the Table tab renders the entity-store field table, every other tab renders the overview.
 */
export const getTabsDisplayed = ({
  entityPanelTabs,
  entityStoreRecord,
  overviewTabProps,
}: GetTabsDisplayedOptions): HostTabType[] =>
  entityPanelTabs.map((tab) => ({
    ...tab,
    content:
      tab.id === TABLE_TAB_ID && entityStoreRecord ? (
        <EntityStoreTableTab entityRecord={entityStoreRecord} />
      ) : (
        <OverviewTab {...overviewTabProps} />
      ),
  }));
