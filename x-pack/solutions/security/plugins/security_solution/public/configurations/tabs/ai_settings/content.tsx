/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { SettingsPanel } from './settings_panel';
import * as i18n from './translations';

export const AiSettingsContent = ({ selectedTab }) => {
  switch (selectedTab) {
    case i18n.CONNECTORS:
      return (
        <>
          <SettingsPanel
            title={i18n.SETTINGS_TITLE}
            description={i18n.SETTINGS_DESCRIPTION}
            buttonText={i18n.SETTINGS_MANAGE_CONNECTORS}
          />
          <SettingsPanel
            title={i18n.SEARCH_CONNECTORS_TITLE}
            description={i18n.SEARCH_CONNECTORS_DESCRIPTION}
            buttonText={i18n.SETTINGS_MANAGE_CONNECTORS}
          />
        </>
      );
    default:
      return (
        <EuiText size="s">
          <p>{`Content for ${selectedTab} will go here.`}</p>
        </EuiText>
      );
  }
};
