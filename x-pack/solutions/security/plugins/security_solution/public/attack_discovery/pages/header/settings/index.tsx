/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';

import { SETTINGS_TAB_ID } from '../../settings_flyout/constants';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
  openFlyout: (tabId: string) => void;
}

const settingsButtonStyles = css`
  border-bottom-left-radius: 0;
  border-top-left-radius: 0;
  min-width: 40px;
  padding-inline: 0;
  width: 40px;
`;

const SettingsComponent: React.FC<Props> = ({ isLoading, openFlyout }) => {
  const onClick = useCallback(
    () => openFlyout(SETTINGS_TAB_ID), // open the settings tab in the flyout
    [openFlyout]
  );

  return (
    <EuiToolTip data-test-subj="settingsTooltip" content={i18n.SETTINGS_TOOLTIP} position="bottom">
      <EuiButton
        aria-label={i18n.SETTINGS}
        color="primary"
        css={settingsButtonStyles}
        data-test-subj="settings"
        iconType="indexSettings"
        isDisabled={isLoading}
        onClick={onClick}
      />
    </EuiToolTip>
  );
};

SettingsComponent.displayName = 'Settings';

export const Settings = React.memo(SettingsComponent);
