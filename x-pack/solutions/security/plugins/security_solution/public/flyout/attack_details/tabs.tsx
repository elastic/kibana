/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { AttackDetailsPanelPaths } from '.';
import { JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './constants/test_ids';
import { cellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { JsonTab as SharedJsonTab } from '../../flyout_v2/shared/components/json_tab';
import { TableTab } from '../../flyout_v2/attack/main/tabs/table_tab';
import { OverviewTab } from './tabs/overview_tab';
import { useAttackDetailsContext } from './context';

export interface AttackDetailsPanelTabType {
  id: AttackDetailsPanelPaths;
  name: ReactElement;
  content: React.ReactElement;
  'data-test-subj': string;
}

/**
 * Adapter that bridges the attack details flyout context to the prop-based `TableTab` that now
 * lives in `flyout_v2`. Reads the `searchHit` from the context, builds a `DataTableRecord`, and
 * forwards it (plus the shared cell-action renderer) so the table view has a single source of
 * truth in `flyout_v2`.
 */
const TableTabContent = memo(() => {
  const { searchHit } = useAttackDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  return <TableTab hit={hit} renderCellActions={cellActionRenderer} />;
});
TableTabContent.displayName = 'TableTabContent';

/**
 * Adapter that bridges the attack details flyout context to the shared `JsonTab`. Reads the
 * `searchHit` from the context and forwards it as a prop so the JSON view has a single source
 * of truth in `flyout_v2`.
 */
const JsonTabContent = memo(() => {
  const { searchHit } = useAttackDetailsContext();

  return (
    <SharedJsonTab
      value={searchHit as unknown as Record<string, unknown>}
      showFooterOffset={false}
      data-test-subj={JSON_TAB_TEST_ID}
    />
  );
});
JsonTabContent.displayName = 'JsonTabContent';

export const overviewTab: AttackDetailsPanelTabType = {
  id: 'overview',
  'data-test-subj': OVERVIEW_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.overviewTabLabel"
      defaultMessage="Overview"
    />
  ),
  content: <OverviewTab />,
};

export const tableTab: AttackDetailsPanelTabType = {
  id: 'table',
  'data-test-subj': TABLE_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.tableTabLabel"
      defaultMessage="Table"
    />
  ),
  content: <TableTabContent />,
};

export const jsonTab: AttackDetailsPanelTabType = {
  id: 'json',
  'data-test-subj': JSON_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.jsonTabLabel"
      defaultMessage="JSON"
    />
  ),
  content: <JsonTabContent />,
};

export const allTabs: AttackDetailsPanelTabType[] = [overviewTab, tableTab, jsonTab];
