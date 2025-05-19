/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { EuiEmptyPrompt, EuiSkeletonRectangle } from '@elastic/eui';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { Table } from './table';
import { useFetchIntegrations } from '../../../../../../../detections/hooks/alert_summary/use_fetch_integrations';
import { useFindRulesQuery } from '../../../../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useKibana } from '../../../../../../../common/lib/kibana';

const DATAVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiForSocTableTab.dataViewError',
  {
    defaultMessage: 'Unable to create data view',
  }
);

export const ERROR_TEST_ID = 'attack-discovery-alert-error';
export const SKELETON_TEST_ID = 'attack-discovery-alert-skeleton';
export const CONTENT_TEST_ID = 'attack-discovery-alert-content';

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };

interface AiForSOCAlertsTabProps {
  /**
   * Id to pass down to the ResponseOps alerts table
   */
  id: string;
  /**
   * Query that contains the id of the alerts to display in the table
   */
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
}

/**
 * Component used in the Attack Discovery alerts table, only in the AI4DSOC tier.
 * It fetches rules, packages (integrations) and creates a local dataView.
 * It renders a loading skeleton while packages are being fetched and while the dataView is being created.
 */
export const AiForSOCAlertsTab = memo(({ id, query }: AiForSOCAlertsTabProps) => {
  const { data } = useKibana().services;
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);
  const [dataViewLoading, setDataViewLoading] = useState<boolean>(true);

  // Fetch all integrations
  const { installedPackages, isLoading: integrationIsLoading } = useFetchIntegrations();

  // Fetch all rules. For the AI for SOC effort, there should only be one rule per integration (which means for now 5-6 rules total)
  const { data: ruleData, isLoading: ruleIsLoading } = useFindRulesQuery({});
  const ruleResponse = useMemo(
    () => ({
      rules: ruleData?.rules || [],
      isLoading: ruleIsLoading,
    }),
    [ruleData, ruleIsLoading]
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
              id={id}
              packages={installedPackages}
              query={query}
              ruleResponse={ruleResponse}
            />
          </div>
        )}
      </>
    </EuiSkeletonRectangle>
  );
});

AiForSOCAlertsTab.displayName = 'AiForSOCAlertsTab';
