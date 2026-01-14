/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLOS_MANAGEMENT_PATH,
  SLOS_PATH,
  SLOS_WELCOME_PATH,
  SLO_CREATE_PATH,
  SLO_DETAIL_PATH,
  SLO_EDIT_PATH,
  SLO_SETTINGS_PATH,
} from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { SloDetailsPage } from '../pages/slo_details/slo_details';
import { SloEditPage } from '../pages/slo_edit/slo_edit';
import { SloManagementPage } from '../pages/slo_management/slo_management_page';
import { SloSettingsPage } from '../pages/slo_settings/slo_settings';
import { SlosPage } from '../pages/slos/slos';
import { SlosWelcomePage } from '../pages/slos_welcome/slos_welcome';

export const getRoutes = (): {
  [key: string]: {
    handler: () => React.ReactElement;
    params: Record<string, string>;
    exact: boolean;
  };
} => {
  return {
    [SLOS_PATH]: {
      handler: () => {
        return <SlosPage />;
      },
      params: {},
      exact: true,
    },
    [SLOS_WELCOME_PATH]: {
      handler: () => {
        return <SlosWelcomePage />;
      },
      params: {},
      exact: true,
    },
    [SLO_CREATE_PATH]: {
      handler: () => {
        return <SloEditPage />;
      },
      params: {},
      exact: true,
    },
    [SLO_EDIT_PATH]: {
      handler: () => {
        return <SloEditPage />;
      },
      params: {},
      exact: true,
    },
    [SLO_SETTINGS_PATH]: {
      handler: () => {
        return <SloSettingsPage />;
      },
      params: {},
      exact: true,
    },
    [SLOS_MANAGEMENT_PATH]: {
      handler: () => {
        return <SloManagementPage />;
      },
      params: {},
      exact: true,
    },
    [SLO_DETAIL_PATH]: {
      handler: () => {
        return <SloDetailsPage />;
      },
      params: {},
      exact: true,
    },
  };
};
