/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiLoadingSpinner, EuiFlexGroup, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { IndexSelectorModal } from '../privileged_user_monitoring_onboarding/components/select_index_modal';
import { useFetchMonitoredIndices } from '../privileged_user_monitoring_onboarding/hooks/use_fetch_monitored_indices';
import type { AddDataSourceResult } from '.';

export const IndexImportManageDataSource = ({
  setAddDataSourceResult,
}: {
  setAddDataSourceResult: (result: AddDataSourceResult) => void;
}) => {
  const [isIndexModalOpen, { on: showIndexModal, off: hideIndexModal }] = useBoolean(false);
  const { data: datasources = [], isFetching, refetch } = useFetchMonitoredIndices();
  const monitoredDataSource = datasources[0];
  const monitoredIndices = monitoredDataSource?.indexPattern
    ? monitoredDataSource.indexPattern.split(',')
    : [];

  const onImport = async () => {
    hideIndexModal();
    setAddDataSourceResult({ successful: true, userCount: 0 });
    await refetch();
  };

  return (
    <>
      <EuiFlexGroup alignItems="flexStart" direction="column">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiIcon size="l" type="indexOpen" />
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices"
                defaultMessage="Indices"
              />
            </h1>
          </EuiText>
        </EuiFlexGroup>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.infoText"
              defaultMessage="One or more indices containing the user.name field. All user names in the indices, specified in the user.name field, will be defined as privileged users."
            />
          </p>

          <h4>
            {isFetching && <EuiLoadingSpinner size="m" data-test-subj="loading-indices-spinner" />}
            {monitoredIndices.length === 0 && (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.noIndicesAdded"
                defaultMessage="No indices added"
              />
            )}
            {monitoredIndices.length > 0 && (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.numIndicesAdded"
                defaultMessage="{indexCount, plural, one {# index} other {# indices}} added"
                values={{ indexCount: monitoredIndices.length }}
              />
            )}
          </h4>
        </EuiText>
        <EuiButton fullWidth={false} iconType="plusInCircle" onClick={showIndexModal}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.btnText"
            defaultMessage="Select index"
          />
        </EuiButton>
      </EuiFlexGroup>

      {isIndexModalOpen && (
        <IndexSelectorModal
          onClose={hideIndexModal}
          onImport={onImport}
          editDataSource={monitoredDataSource}
        />
      )}
    </>
  );
};
