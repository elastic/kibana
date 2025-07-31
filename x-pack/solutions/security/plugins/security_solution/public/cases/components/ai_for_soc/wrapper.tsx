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
import React, { memo, useMemo } from 'react';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { useCreateDataView } from '../../../common/hooks/use_create_data_view';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useFindRulesQuery } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useFetchIntegrations } from '../../../detections/hooks/alert_summary/use_fetch_integrations';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { Table } from './table';

const DATAVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiForSocTableTab.dataViewError',
  {
    defaultMessage: 'Unable to create data view',
  }
);

export const ERROR_TEST_ID = 'cases-alert-error';
export const SKELETON_TEST_ID = 'cases-alert-skeleton';
export const CONTENT_TEST_ID = 'cases-alert-content';

interface AiForSOCAlertsTableProps {
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
 * Component used in the Cases page under the Alerts tab, only in the AI4DSOC tier.
 * It fetches rules, packages (integrations) and creates a local dataView.
 * It renders a loading skeleton while packages are being fetched and while the dataView is being created.
 */
export const AiForSOCAlertsTable = memo(({ id, onLoaded, query }: AiForSOCAlertsTableProps) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const spaceId = useSpaceId();
  const dataViewSpec = useMemo(() => ({ title: `${DEFAULT_ALERTS_INDEX}-${spaceId}` }), [spaceId]);

  const { dataView: oldDataView, loading: oldDataViewLoading } = useCreateDataView({
    dataViewSpec,
    skip: newDataViewPickerEnabled, // skip data view creation if the new data view picker is enabled
  });

  const { dataView: experimentalDataView, status } = useDataView(SourcererScopeName.detections);
  const dataViewLoading = newDataViewPickerEnabled ? status !== 'ready' : oldDataViewLoading;
  const dataView = newDataViewPickerEnabled ? experimentalDataView : oldDataView;

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
              onLoaded={onLoaded}
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

AiForSOCAlertsTable.displayName = 'AiForSOCAlertsTable';
