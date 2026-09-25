/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AGENT_BUILDER_API_DISCOVERY_SETTING_ID,
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
} from '@kbn/management-settings-ids';

/** Advanced settings that must all be enabled for the Agent Builder chat entry points to work. */
export const REQUIRED_UI_SETTING_IDS = [
  AGENT_BUILDER_API_DISCOVERY_SETTING_ID,
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
];

const REQUIRED_SETTINGS_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.siemMigrations.requiredSettingsTooltip',
  {
    defaultMessage:
      'To add rules to chat, enable the following in Stack Management → Advanced Settings:',
  }
);

export const RequiredUiSettingsTooltipContent = React.memo<{ settingNames: string[] }>(
  ({ settingNames }) => (
    <>
      {REQUIRED_SETTINGS_TOOLTIP_CONTENT}
      <EuiCode>
        <ul>
          {settingNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </EuiCode>
    </>
  )
);
RequiredUiSettingsTooltipContent.displayName = 'RequiredUiSettingsTooltipContent';
