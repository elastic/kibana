/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { EuiEmptyPrompt, EuiSkeletonRectangle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter, Query } from '@kbn/es-query';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import { Table } from './table';
import { useFetchIntegrations } from '../../../../../detections/hooks/alert_summary/use_fetch_integrations';
import { useKibana } from '../../../../../common/lib/kibana';

const DATAVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiForSocTableTab.dataViewError',
  {
    defaultMessage: 'Unable to create data view',
  }
);

export const ERROR_TEST_ID = 'cases-alert-error';
export const SKELETON_TEST_ID = 'cases-alert-skeleton';
export const CONTENT_TEST_ID = 'cases-alert-content';

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };

interface AiForSOCAlertsTableProps {
  /**
   * Filters passed from the rule details page.
   * These contain the default filters (alerts, show building block, status and threat match) as well
   * as the ones from the KQL bar.
   */
  filters: Filter[];
  /**
   * From value retrieved from the global KQL bar
   */
  from: string;
  /**
   * Query retrieved from the global KQL bar
   */
  query: Query;
  /**
   * Result from the useQuery to fetch the rule
   */
  rule: RuleResponse;
  /**
   * To value retrieved from the global KQL bar
   */
  to: string;
}

/**
 * Component used in the Cases page under the Alerts tab, only in the AI4DSOC tier.
 * It fetches rules, packages (integrations) and creates a local dataView.
 * It renders a loading skeleton while packages are being fetched and while the dataView is being created.
 */
export const AiForSOCAlertsTable = memo(
  ({ filters, from, query, rule, to }: AiForSOCAlertsTableProps) => {
    const { data } = useKibana().services;
    const [dataView, setDataView] = useState<DataView | undefined>(undefined);
    const [dataViewLoading, setDataViewLoading] = useState<boolean>(true);

    // Fetch all integrations
    const { installedPackages, isLoading: integrationIsLoading } = useFetchIntegrations();

    const ruleResponse = useMemo(
      () => ({
        rules: [rule],
        isLoading: false,
      }),
      [rule]
    );

    useEffect(() => {
      let dv: DataView;
      const createDataView = async () => {
        try {
          dv = await data.dataViews.create(dataViewSpec);
          setDataView(dv);
          setDataViewLoading(false);
        } catch (err) {
          setDataViewLoading(false);
        }
      };
      createDataView();

      // clearing after leaving the page
      return () => {
        if (dv?.id) {
          data.dataViews.clearInstanceCache(dv.id);
        }
      };
    }, [data.dataViews]);

    return (
      <EuiSkeletonRectangle
        data-test-subj={SKELETON_TEST_ID}
        height={400}
        isLoading={integrationIsLoading || dataViewLoading}
        width="100%"
      >
        <>
          {!dataView || !dataView.id ? (
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
                filters={filters}
                from={from}
                packages={installedPackages}
                query={query}
                ruleResponse={ruleResponse}
                to={to}
              />
            </div>
          )}
        </>
      </EuiSkeletonRectangle>
    );
  }
);

AiForSOCAlertsTable.displayName = 'AiForSOCAlertsTable';
