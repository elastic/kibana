/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ATTACK_TAB_COLUMN_ACTIONS_TEST_ID,
  ATTACK_TAB_COLUMN_ALERTS_TEST_ID,
  ATTACK_TAB_COLUMN_ATTACHED_AT_TEST_ID,
  ATTACK_TAB_COLUMN_ATTACHED_BY_TEST_ID,
  ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID,
  ATTACK_TAB_COLUMN_RISK_SCORE_TEST_ID,
  ATTACK_TAB_COLUMN_STATUS_TEST_ID,
  ATTACK_TAB_COLUMN_SUMMARY_TEST_ID,
  ATTACK_TAB_COLUMN_TITLE_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';
import type { AttackTabColumnId } from '../utils';
import { ATTACK_TAB_COLUMN_ID } from '../utils';

export const COLUMN_HEADERS: Record<AttackTabColumnId, string> = {
  [ATTACK_TAB_COLUMN_ID.actions]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.actionsColumn',
    { defaultMessage: 'Actions' }
  ),
  [ATTACK_TAB_COLUMN_ID.detectedOn]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.detectedOnColumn',
    { defaultMessage: 'Detected on' }
  ),
  [ATTACK_TAB_COLUMN_ID.title]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.titleColumn',
    { defaultMessage: 'Title' }
  ),
  [ATTACK_TAB_COLUMN_ID.alerts]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.alertsColumn',
    { defaultMessage: 'Alerts' }
  ),
  [ATTACK_TAB_COLUMN_ID.summary]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.summaryColumn',
    { defaultMessage: 'Summary' }
  ),
  [ATTACK_TAB_COLUMN_ID.riskScore]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.riskScoreColumn',
    { defaultMessage: 'Risk score' }
  ),
  [ATTACK_TAB_COLUMN_ID.status]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.statusColumn',
    { defaultMessage: 'Status' }
  ),
  [ATTACK_TAB_COLUMN_ID.attachedBy]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.attachedByColumn',
    { defaultMessage: 'Attached by' }
  ),
  [ATTACK_TAB_COLUMN_ID.attachedAt]: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.tab.attachedAtColumn',
    { defaultMessage: 'Attached at' }
  ),
};

export const CELL_TEST_IDS: Record<AttackTabColumnId, string> = {
  [ATTACK_TAB_COLUMN_ID.actions]: ATTACK_TAB_COLUMN_ACTIONS_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.detectedOn]: ATTACK_TAB_COLUMN_DETECTED_ON_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.title]: ATTACK_TAB_COLUMN_TITLE_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.alerts]: ATTACK_TAB_COLUMN_ALERTS_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.summary]: ATTACK_TAB_COLUMN_SUMMARY_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.riskScore]: ATTACK_TAB_COLUMN_RISK_SCORE_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.status]: ATTACK_TAB_COLUMN_STATUS_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.attachedBy]: ATTACK_TAB_COLUMN_ATTACHED_BY_TEST_ID,
  [ATTACK_TAB_COLUMN_ID.attachedAt]: ATTACK_TAB_COLUMN_ATTACHED_AT_TEST_ID,
};

/** `actions` is a leading control column, so it is absent here and from the column picker. */
export const GRID_COLUMNS: EuiDataGridColumn[] = [
  {
    id: ATTACK_TAB_COLUMN_ID.detectedOn,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.detectedOn],
    initialWidth: 200,
    isExpandable: false,
  },
  {
    id: ATTACK_TAB_COLUMN_ID.title,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.title],
    initialWidth: 320,
    isExpandable: false,
  },
  {
    id: ATTACK_TAB_COLUMN_ID.alerts,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.alerts],
    initialWidth: 90,
    isExpandable: false,
  },
  {
    // The only expandable column, as its prose shows one line in the cell.
    id: ATTACK_TAB_COLUMN_ID.summary,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.summary],
    isSortable: false,
  },
  {
    id: ATTACK_TAB_COLUMN_ID.riskScore,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.riskScore],
    initialWidth: 110,
    isExpandable: false,
  },
  {
    id: ATTACK_TAB_COLUMN_ID.status,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.status],
    initialWidth: 130,
    isExpandable: false,
  },
  {
    id: ATTACK_TAB_COLUMN_ID.attachedBy,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.attachedBy],
    initialWidth: 160,
    isExpandable: false,
  },
  {
    id: ATTACK_TAB_COLUMN_ID.attachedAt,
    displayAsText: COLUMN_HEADERS[ATTACK_TAB_COLUMN_ID.attachedAt],
    initialWidth: 200,
    isExpandable: false,
  },
];
