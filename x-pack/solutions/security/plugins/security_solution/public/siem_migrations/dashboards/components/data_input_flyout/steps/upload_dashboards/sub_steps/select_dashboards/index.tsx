/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiStepStatus } from '@elastic/eui';
import * as i18n from './translations';
import { SelectDashboardsSubStep } from './select_dashboards';
import type { SplunkDashboardsResult } from '../../../../types';

interface UseSelectDashboardsSubStepArgs {
  status: EuiStepStatus;
  onSelectionChange: (selectedDashboards: SplunkDashboardsResult[]) => void;
  dashboards: SplunkDashboardsResult[];
}

export const useSelectDashboardsSubStep = ({
  status,
  onSelectionChange,
  dashboards,
}: UseSelectDashboardsSubStepArgs) => {
  return useMemo(
    () => ({
      title: i18n.SELECT_DASHBOARDS_TITLE,
      status,
      children:
        dashboards.length > 0 ? (
          <SelectDashboardsSubStep dashboards={dashboards} onSelectionChange={onSelectionChange} />
        ) : null,
    }),
    [dashboards, onSelectionChange, status]
  );
};
