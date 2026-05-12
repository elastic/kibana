/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './constants/test_ids';
import { JsonTab } from './tabs/json_tab';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from './tabs/table_tab';
import type { AttackDetailsPanelTabType } from './types';

export interface OverviewTabFactoryProps {
  /**
   * Callback that opens the attack-specific Entities child flyout.
   */
  onShowAttackEntities: () => void;
  /**
   * Callback that opens the attack-specific Correlations child flyout.
   */
  onShowAttackCorrelations: () => void;
}

/**
 * Factory for the Overview tab. The Overview tab needs the Insights → Entities
 * and Insights → Correlations title-link callbacks, which are constructed in
 * `flyout_v2/attack_details/index.tsx` via `useKibana()` + `useStore()` +
 * `useHistory()` + `overlays.openSystemFlyout(...)` and threaded down through
 * the tab tree. Returning a factory keeps the tab definition shape consistent
 * with `tableTab`/`jsonTab` while allowing per-instance callbacks.
 */
export const overviewTab = ({
  onShowAttackEntities,
  onShowAttackCorrelations,
}: OverviewTabFactoryProps): AttackDetailsPanelTabType => ({
  id: 'overview',
  'data-test-subj': OVERVIEW_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.overviewTabLabel"
      defaultMessage="Overview"
    />
  ),
  content: (
    <OverviewTab
      onShowAttackEntities={onShowAttackEntities}
      onShowAttackCorrelations={onShowAttackCorrelations}
    />
  ),
});

export const tableTab: AttackDetailsPanelTabType = {
  id: 'table',
  'data-test-subj': TABLE_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.tableTabLabel"
      defaultMessage="Table"
    />
  ),
  content: <TableTab />,
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
  content: <JsonTab />,
};
