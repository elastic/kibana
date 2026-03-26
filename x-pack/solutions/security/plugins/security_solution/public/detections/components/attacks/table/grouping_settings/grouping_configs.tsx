/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroupOption, GroupSettings } from '@kbn/grouping/src';
import { i18n } from '@kbn/i18n';

import { ALERT_ATTACK_IDS } from '../../../../../../common/field_maps/field_names';

const ATTACK_NAME = i18n.translate('xpack.securitySolution.attacks.alertsTable.groups.attackName', {
  defaultMessage: 'Attack',
});

const GROUP_BY_ATTACK_LABEL = i18n.translate(
  'xpack.securitySolution.attacks.alertsTable.groups.popoverButtonLabel',
  {
    defaultMessage: 'Group by attack',
  }
);

/**
 * Returns a list of fields for the default grouping options. These are displayed in the `Group alerts by` dropdown button.
 * The default values are:
 * - kibana.alert.attack_ids
 *
 * These go hand in hand with groupTitleRenderers, groupStatsRenderer and groupStatsAggregations
 */
export const groupingOptions: GroupOption[] = [
  {
    label: ATTACK_NAME,
    key: ALERT_ATTACK_IDS,
  },
];

export const groupingSettings: GroupSettings = {
  hideNoneOption: true,
  hideCustomFieldOption: true,
  hideOptionsTitle: true,
  popoverButtonLabel: GROUP_BY_ATTACK_LABEL,
  enforcedGroups: [ALERT_ATTACK_IDS],
};
