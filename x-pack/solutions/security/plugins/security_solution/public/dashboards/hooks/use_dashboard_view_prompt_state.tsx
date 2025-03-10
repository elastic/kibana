/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import type { EuiEmptyPromptProps } from '@elastic/eui';
import * as i18n from '../pages/details/translations';

export enum DashboardViewPromptState {
  NoReadPermission = 'NoReadPermission',
}

const dashboardViewPromptState: Record<DashboardViewPromptState, Partial<EuiEmptyPromptProps>> = {
  [DashboardViewPromptState.NoReadPermission]: {
    color: 'danger',
    iconType: 'error',
    title: <h2>{i18n.DASHBOARD_NO_READ_PERMISSION_TITLE}</h2>,
    body: <p>{i18n.DASHBOARD_NO_READ_PERMISSION_DESCRIPTION}</p>,
  },
};

export const useDashboardViewPromptState = (
  currentState: DashboardViewPromptState | null
): Partial<EuiEmptyPromptProps> | null => {
  return currentState ? dashboardViewPromptState[currentState] : null;
};
