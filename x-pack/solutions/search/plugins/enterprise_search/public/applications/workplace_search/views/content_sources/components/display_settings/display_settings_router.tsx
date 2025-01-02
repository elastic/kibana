/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { AppLogic } from '../../../../app_logic';
import {
  DISPLAY_SETTINGS_RESULT_DETAIL_PATH,
  DISPLAY_SETTINGS_SEARCH_RESULT_PATH,
  getSourcesPath,
} from '../../../../routes';

import { DisplaySettings } from './display_settings';

export const DisplaySettingsRouter: React.FC = () => {
  const { isOrganization } = useValues(AppLogic);
  return (
    <Routes>
      <Route exact path={getSourcesPath(DISPLAY_SETTINGS_SEARCH_RESULT_PATH, isOrganization)}>
        <DisplaySettings tabId={0} />
      </Route>
      <Route exact path={getSourcesPath(DISPLAY_SETTINGS_RESULT_DETAIL_PATH, isOrganization)}>
        <DisplaySettings tabId={1} />
      </Route>
    </Routes>
  );
};
