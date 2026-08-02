/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { usePndClientConfig, useIsDemoMode } from '../../hooks/use_pnd_client_config';
import * as i18n from './translations';

interface SettingRowProps {
  description: string;
  hint?: string;
  settingKey: string;
  value: string;
  valueColor: 'default' | 'hollow' | 'warning';
}

const SettingRow: React.FC<SettingRowProps> = ({
  description,
  hint,
  settingKey,
  value,
  valueColor,
}) => (
  <>
    <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiCode>{settingKey}</EuiCode>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={valueColor} data-test-subj={`pndSettingValue-${settingKey}`}>
          {value}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="xs" />
    <EuiText color="subdued" size="s">
      <p>
        {description}
        {hint != null ? ` ${hint}` : null}
      </p>
    </EuiText>
  </>
);

/**
 * The switches a reader has to set, in one place.
 *
 * This page used to say only that `xpack.pnd.ui.useMockData` exists, which was
 * the whole story when the app served fixtures. It is not any more: the
 * approvals queue, runs, conversations, the four-phase view and the autonomy
 * level all read the internal PND API, so mock data now covers the Watch catalog
 * alone and the two switches that actually decide whether the loop runs
 * (`xpack.pnd.enabled` and the per-space Attack Discovery setting) were not
 * mentioned at all.
 *
 * Nothing here is editable: PND has no writable settings of its own, and the one
 * per-space value the app does write — the autonomy level — is written from the
 * watch it belongs to, behind its own privilege.
 */
export const SettingsPage: React.FC = () => {
  const config = usePndClientConfig();
  const isDemoMode = useIsDemoMode();
  usePndDocTitle(i18n.PAGE_TITLE);

  return (
    <PndPageSection>
      <PndPageHeader title={i18n.PAGE_TITLE} subtitle={i18n.PAGE_SUBTITLE} />

      <EuiText size="s">
        <p>{i18n.INTRO}</p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder paddingSize="m">
        <SettingRow
          description={i18n.PND_ENABLED_DESCRIPTION}
          hint={i18n.REQUIRED_TO_BE_HERE_HINT}
          settingKey={i18n.SETTING_PND_ENABLED}
          value={i18n.REQUIRED_TO_BE_HERE}
          valueColor="hollow"
        />

        <EuiHorizontalRule margin="m" />

        <SettingRow
          description={i18n.ATTACK_DISCOVERY_WORKFLOWS_DESCRIPTION}
          hint={i18n.SETTING_PER_SPACE_HINT}
          settingKey={i18n.SETTING_ATTACK_DISCOVERY_WORKFLOWS}
          value={i18n.SETTING_PER_SPACE}
          valueColor="hollow"
        />

        <EuiHorizontalRule margin="m" />

        <SettingRow
          description={i18n.DEMO_FORCE_INCIDENT_DESCRIPTION}
          settingKey={i18n.SETTING_DEMO_FORCE_INCIDENT}
          value={isDemoMode ? i18n.SETTING_ON : i18n.SETTING_OFF}
          valueColor={isDemoMode ? 'warning' : 'hollow'}
        />

        <EuiHorizontalRule margin="m" />

        <SettingRow
          description={i18n.USE_MOCK_DATA_DESCRIPTION}
          settingKey={i18n.SETTING_USE_MOCK_DATA}
          value={config?.ui.useMockData === true ? i18n.SETTING_ON : i18n.SETTING_OFF}
          valueColor={config?.ui.useMockData === true ? 'warning' : 'hollow'}
        />
        <EuiSpacer size="xs" />
        <EuiText color="subdued" data-test-subj="pndSettingsMockDataScopeNote" size="s">
          <p>{i18n.USE_MOCK_DATA_SCOPE_NOTE}</p>
        </EuiText>
      </EuiPanel>
    </PndPageSection>
  );
};
