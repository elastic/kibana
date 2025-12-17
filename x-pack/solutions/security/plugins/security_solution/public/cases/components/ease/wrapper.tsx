/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiEmptyPrompt, EuiSkeletonRectangle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertsTableOnLoadedProps } from '@kbn/response-ops-alerts-table/types';
import React, { memo } from 'react';
import { useCreateEaseAlertsDataView } from '../../../detections/hooks/alert_summary/use_create_data_view';
import { useFetchIntegrations } from '../../../detections/hooks/alert_summary/use_fetch_integrations';
import { Table } from './table';

const DATAVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.easeTableTab.dataViewError',
  {
    defaultMessage: 'Unable to create data view',
  }
);

export const ERROR_TEST_ID = 'cases-alert-error';
export const SKELETON_TEST_ID = 'cases-alert-skeleton';
export const CONTENT_TEST_ID = 'cases-alert-content';

interface EaseAlertsTableProps {
  /**
   * Id to pass down to the ResponseOps alerts table
   */
  id: string;
  /**
   * Callback fired when the alerts have been first loaded
   */
  onLoaded?: (props: AlertsTableOnLoadedProps) => void;
  /**
   * Query that contains the id of the alerts to display in the table
   */
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
}

/**
 * Component used in the Cases page under the Alerts tab, only in the EASE tier.
 * It fetches packages (integrations) and creates a local dataView.
 * It renders a loading skeleton while packages are being fetched and while the dataView is being created.
 */
export const EaseAlertsTable = memo(({ id, onLoaded, query }: EaseAlertsTableProps) => {
  const { dataView, loading: dataViewLoading } = useCreateEaseAlertsDataView();

  const { installedPackages, isLoading: integrationIsLoading } = useFetchIntegrations();

  return (
    <EuiSkeletonRectangle
      data-test-subj={SKELETON_TEST_ID}
      height={400}
      isLoading={integrationIsLoading || dataViewLoading}
      width="100%"
    >
      <>
        {!dataView ? (
          <EuiEmptyPrompt
            color="danger"
            data-test-subj={ERROR_TEST_ID}
            iconType="error"
            title={<h2>{DATAVIEW_ERROR}</h2>}
          />
        ) : (
          <div data-test-subj={CONTENT_TEST_ID}>
            <Table
              dataView={dataView}
              id={id}
              onLoaded={onLoaded}
              packages={installedPackages}
              query={query}
            />
          </div>
        )}
      </>
    </EuiSkeletonRectangle>
  );
});

EaseAlertsTable.displayName = 'EaseAlertsTable';
