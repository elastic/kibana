/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { JSON_TAB_TEST_ID, OVERVIEW_TAB_TEST_ID, TABLE_TAB_TEST_ID } from './constants/test_ids';
import { JsonTab } from './tabs/json_tab';
import { OverviewTab } from './tabs/overview_tab';
import { TableTab } from './tabs/table_tab';
import type { AttackDetailsPanelTabType } from './types';

export interface OverviewTabFactoryProps {
  /**
   * Attack-discovery document hit forwarded to the Overview tab.
   */
  hit: DataTableRecord;
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails}. Used
   * by the AI Summary section to render the markdown bodies — sourcing the
   * markdown from the resolved alert (rather than `hit.flattened` /
   * `hit.raw._source`) keeps it working regardless of which entry point
   * built the hit.
   */
  attack: AttackDiscoveryAlert;
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
 * `flyout_v2/attack_details/main/index.tsx` via `useKibana()` + `useStore()` +
 * `useHistory()` + `overlays.openSystemFlyout(...)` and threaded down through
 * the tab tree. Returning a factory keeps the tab definition shape consistent
 * with `tableTab`/`jsonTab` while allowing per-instance props.
 */
export const overviewTab = ({
  hit,
  attack,
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
      hit={hit}
      attack={attack}
      onShowAttackEntities={onShowAttackEntities}
      onShowAttackCorrelations={onShowAttackCorrelations}
    />
  ),
});

export interface TableTabFactoryProps {
  hit: DataTableRecord;
  browserFields: BrowserFields;
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

/**
 * Factory for the Table tab. Needs the resolved `browserFields` /
 * `dataFormattedForFieldBrowser` from {@link useAttackDetails} so the table
 * can render one row per field.
 */
export const tableTab = ({
  hit,
  browserFields,
  dataFormattedForFieldBrowser,
}: TableTabFactoryProps): AttackDetailsPanelTabType => ({
  id: 'table',
  'data-test-subj': TABLE_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.tableTabLabel"
      defaultMessage="Table"
    />
  ),
  content: (
    <TableTab
      hit={hit}
      browserFields={browserFields}
      dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
    />
  ),
});

export interface JsonTabFactoryProps {
  hit: DataTableRecord;
}

/**
 * Factory for the JSON tab. The JSON view is driven entirely from
 * `hit.raw` (the underlying `SearchHit`).
 */
export const jsonTab = ({ hit }: JsonTabFactoryProps): AttackDetailsPanelTabType => ({
  id: 'json',
  'data-test-subj': JSON_TAB_TEST_ID,
  name: (
    <FormattedMessage
      id="xpack.securitySolution.attackDetailsFlyout.content.jsonTabLabel"
      defaultMessage="JSON"
    />
  ),
  content: <JsonTab hit={hit} />,
});
