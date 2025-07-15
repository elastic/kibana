/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiEmptyPrompt, EuiSkeletonRectangle } from '@elastic/eui';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { Table } from './table';
import { useSpaceId } from '../../../../../../../common/hooks/use_space_id';
import { useFetchIntegrations } from '../../../../../../../detections/hooks/alert_summary/use_fetch_integrations';
import { useFindRulesQuery } from '../../../../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useCreateDataView } from '../../../../../../../common/hooks/use_create_data_view';
import { useIsExperimentalFeatureEnabled } from '../../../../../../../common/hooks/use_experimental_features';
import { useDataView } from '../../../../../../../data_view_manager/hooks/use_data_view';
import { SourcererScopeName } from '../../../../../../../sourcerer/store/model';
import { DEFAULT_ALERTS_INDEX } from '../../../../../../../../common/constants';

const DATAVIEW_ERROR = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiForSocTableTab.dataViewError',
  {
    defaultMessage: 'Unable to create data view',
  }
);

export const ERROR_TEST_ID = 'attack-discovery-alert-error';
export const SKELETON_TEST_ID = 'attack-discovery-alert-skeleton';
export const CONTENT_TEST_ID = 'attack-discovery-alert-content';

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
