/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { Footer } from './footer';
import * as i18n from './translations';
import { useSettingsView } from './hooks/use_settings_view';
import { useTabsView } from './hooks/use_tabs_view';
import type { FilterSettings } from './types';

export const DEFAULT_STACK_BY_FIELD = 'kibana.alert.rule.name';

const MIN_WIDTH = 448; // px

const SettingsFlyoutComponent: React.FC<FilterSettings> = (filterSettings) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'attackDiscoverySettingsFlyoutTitle',
  });

  const isAttackDiscoverySchedulingEnabled = useIsExperimentalFeatureEnabled(
    'assistantAttackDiscoverySchedulingEnabled'
  );

  const { onClose } = filterSettings;

  const { settingsView, actionButtons: settingsActionButtons } = useSettingsView({
    filterSettings,
  });

  const { tabsContainer, actionButtons: tabsActionButtons } = useTabsView({ filterSettings });

  const content = useMemo(() => {
    if (isAttackDiscoverySchedulingEnabled) {
      return tabsContainer;
    }
    return settingsView;
  }, [isAttackDiscoverySchedulingEnabled, settingsView, tabsContainer]);

  const actionButtons = useMemo(() => {
    if (isAttackDiscoverySchedulingEnabled) {
      return tabsActionButtons;
    }
    return settingsActionButtons;
  }, [isAttackDiscoverySchedulingEnabled, settingsActionButtons, tabsActionButtons]);

  return (
    <EuiFlyoutResizable
      aria-labelledby={flyoutTitleId}
      data-test-subj="settingsFlyout"
      minWidth={MIN_WIDTH}
      onClose={onClose}
      paddingSize="m"
      side="right"
      size="s"
      type="overlay"
    >
      <EuiFlyoutHeader hasBorder={!isAttackDiscoverySchedulingEnabled}>
        <EuiTitle data-test-subj="title" size="m">
          <h2 id={flyoutTitleId}>{i18n.ATTACK_DISCOVERY_SETTINGS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiSpacer size="s" />
        {content}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <Footer closeModal={onClose} actionButtons={actionButtons} />
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
};

SettingsFlyoutComponent.displayName = 'SettingsFlyoutComponent';

export const SettingsFlyout = React.memo(SettingsFlyoutComponent);
