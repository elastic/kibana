/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import {
  SLO_GLOBAL_SETTINGS_PATH,
  SLO_SETTINGS_PATH,
} from '@kbn/slo-shared-plugin/common/locators/paths';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';

export type SettingsTab = 'space' | 'global';

export function useActiveSettingsTab(): SettingsTab {
  const history = useHistory();
  return history.location.pathname === SLO_GLOBAL_SETTINGS_PATH ? 'global' : 'space';
}

export function useSloSettingsHeaderTabs({
  showGlobalTab,
}: {
  showGlobalTab: boolean;
}): AppHeaderTab[] | undefined {
  const history = useHistory();
  const activeTab = useActiveSettingsTab();

  return useMemo(
    () =>
      showGlobalTab
        ? [
            {
              id: 'space',
              label: i18n.translate('xpack.slo.settingsPage.tab.space', {
                defaultMessage: 'Space',
              }),
              isSelected: activeTab === 'space',
              onClick: () => history.push(SLO_SETTINGS_PATH),
              'data-test-subj': 'sloSettingsTabSpace',
            },
            {
              id: 'global',
              label: i18n.translate('xpack.slo.settingsPage.tab.global', {
                defaultMessage: 'Global',
              }),
              isSelected: activeTab === 'global',
              onClick: () => history.push(SLO_GLOBAL_SETTINGS_PATH),
              'data-test-subj': 'sloSettingsTabGlobal',
            },
          ]
        : undefined,
    [activeTab, history, showGlobalTab]
  );
}
