/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import React from 'react';

import { TableId } from '@kbn/securitysolution-data-table';
import { PageScope } from '../../../../../data_view_manager/constants';
import { AlertsTable } from '../../../alerts_table';

export const ALERTS_TAB_TEST_ID = 'alertsTab';

interface AlertsTabProps {
  /** Filters applied from grouping */
  groupingFilters: Filter[];
  /** Default filters to apply to the alerts table */
  defaultFilters: Filter[];
  /** Whether the alerts table is in a loading state */
  isTableLoading: boolean;
}

/**
 * Component that displays the alerts tab content, rendering an AlertsTable
 * with filters for the specific attack's alerts.
 */
export const AlertsTab = React.memo<AlertsTabProps>(
  ({ groupingFilters, defaultFilters, isTableLoading }) => {
    return (
      <div data-test-subj={ALERTS_TAB_TEST_ID}>
        <AlertsTable
          tableType={TableId.alertsOnAttacksPage}
          inputFilters={[...defaultFilters, ...groupingFilters]}
          isLoading={isTableLoading}
          pageScope={PageScope.alerts} // show only detection alerts
          disableAdditionalToolbarControls={groupingFilters.length > 0}
        />
      </div>
    );
  }
);
AlertsTab.displayName = 'AlertsTab';
