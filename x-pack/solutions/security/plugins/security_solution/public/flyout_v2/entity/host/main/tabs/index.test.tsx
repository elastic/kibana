/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { EntityPanelTabType } from '../../../../../flyout/entity_details/shared/components/entity_panel_tabs';
import {
  OVERVIEW_TAB_ID,
  TABLE_TAB_ID,
} from '../../../../../flyout/entity_details/shared/hooks/use_entity_panel_tabs';
import type { EntityStoreRecord } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { OverviewTabProps } from './overview_tab';
import { getTabsDisplayed } from '.';

jest.mock('./overview_tab', () => ({
  OverviewTab: () => <div data-test-subj="overview-content" />,
}));

jest.mock('../../../../../flyout/entity_details/shared/components/entity_store_table_tab', () => ({
  EntityStoreTableTab: () => <div data-test-subj="table-content" />,
}));

const entityPanelTabs: EntityPanelTabType[] = [
  { id: OVERVIEW_TAB_ID, name: <>{'Overview'}</>, 'data-test-subj': 'overview-tab' },
  { id: TABLE_TAB_ID, name: <>{'Fields'}</>, 'data-test-subj': 'table-tab' },
];

const overviewTabProps = {} as OverviewTabProps;
const entityStoreRecord = { entity: { id: 'host-1' } } as unknown as EntityStoreRecord;

describe('host getTabsDisplayed', () => {
  it('preserves the tab ids and names from the entity panel tabs', () => {
    const tabs = getTabsDisplayed({ entityPanelTabs, entityStoreRecord, overviewTabProps });
    expect(tabs.map((tab) => tab.id)).toEqual([OVERVIEW_TAB_ID, TABLE_TAB_ID]);
  });

  it('renders the overview content for the overview tab', () => {
    const tabs = getTabsDisplayed({ entityPanelTabs, entityStoreRecord, overviewTabProps });
    const overview = tabs.find((tab) => tab.id === OVERVIEW_TAB_ID);
    const { getByTestId } = render(<>{overview?.content}</>);
    expect(getByTestId('overview-content')).toBeInTheDocument();
  });

  it('renders the entity store table for the table tab when a record is present', () => {
    const tabs = getTabsDisplayed({ entityPanelTabs, entityStoreRecord, overviewTabProps });
    const table = tabs.find((tab) => tab.id === TABLE_TAB_ID);
    const { getByTestId } = render(<>{table?.content}</>);
    expect(getByTestId('table-content')).toBeInTheDocument();
  });

  it('falls back to overview content for the table tab when no record is present', () => {
    const tabs = getTabsDisplayed({ entityPanelTabs, entityStoreRecord: null, overviewTabProps });
    const table = tabs.find((tab) => tab.id === TABLE_TAB_ID);
    const { getByTestId } = render(<>{table?.content}</>);
    expect(getByTestId('overview-content')).toBeInTheDocument();
  });
});
