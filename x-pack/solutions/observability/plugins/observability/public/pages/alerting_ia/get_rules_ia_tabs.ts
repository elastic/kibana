/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

export type RulesIaTabId = 'v1' | 'v2';

/**
 * AppHeader tabs for the Observability Rules hub (ES|QL + classic only).
 * Rules Library lives only in the Alerts sub-menu, not here.
 * Tabs use onClick so switching stays on the Rules hub URL (no Stack Management jump).
 */
export function getRulesIaTabs({
  selected,
  onSelect,
}: {
  selected: RulesIaTabId;
  onSelect: (tab: RulesIaTabId) => void;
}): AppHeaderTab[] {
  return [
    {
      id: 'v2',
      label: i18n.translate('xpack.observability.alertingIa.rulesHub.tab.v2', {
        defaultMessage: 'ES|QL rules',
      }),
      isSelected: selected === 'v2',
      onClick: () => onSelect('v2'),
      'data-test-subj': 'alertingIaRulesTabV2',
    },
    {
      id: 'v1',
      label: i18n.translate('xpack.observability.alertingIa.rulesHub.tab.v1', {
        defaultMessage: 'Classic rules',
      }),
      isSelected: selected === 'v1',
      onClick: () => onSelect('v1'),
      'data-test-subj': 'alertingIaRulesTabV1',
    },
  ];
}
