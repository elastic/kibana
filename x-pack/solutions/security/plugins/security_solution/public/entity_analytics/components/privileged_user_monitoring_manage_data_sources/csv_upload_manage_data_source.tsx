/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiFlexGroup,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { useGetLatestCSVPrivilegedUserUploadQuery } from './hooks/manage_data_sources_query_hooks';
import { UploadPrivilegedUsersModal } from '../privileged_user_monitoring_onboarding/components/file_uploader';
import type { AddDataSourceResult } from '.';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';

export const CsvUploadManageDataSource = ({
  setAddDataSourceResult,
  namespace,
}: {
  setAddDataSourceResult: (result: AddDataSourceResult) => void;
  namespace: string;
}) => {
  const [isImportFileModalVisible, { on: showImportFileModal, off: closeImportFileModal }] =
    useBoolean(false);

  const { latestTimestamp, isLoading, isError, refetch } =
    useGetLatestCSVPrivilegedUserUploadQuery(namespace);

  return (
    <>
      <EuiFlexGroup alignItems="flexStart" direction="column">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiIcon size="l" type="importAction" />
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.file"
                defaultMessage="File"
              />
            </h1>
          </EuiText>
        </EuiFlexGroup>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.file.text"
              defaultMessage="CSV file exported from your user management tool. Only one file can be added as a data source, and privileged users previously uploaded through CSV will be overwritten."
            />
          </p>
          {isError && (
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.file.retrievalError"
                  defaultMessage="There was an error retrieving previous CSV uploads."
                />
              }
              color="danger"
            />
          )}
          {isLoading && <EuiLoadingSpinner size="l" />}
          {!isLoading && !isError && !latestTimestamp && (
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.file.noFilesAdded"
                defaultMessage="No files added"
              />
            </h4>
          )}
          {latestTimestamp && (
            <h4>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.file.lastUpdatedTimestamp"
                defaultMessage="Last uploaded: "
              />
              <PreferenceFormattedDate value={new Date(latestTimestamp)} />
            </h4>
          )}
        </EuiText>
        <EuiButton
          disabled={isError || isLoading}
          onClick={showImportFileModal}
          fullWidth={false}
          iconType="plusInCircle"
        >
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.manageDataSources.indices.text"
            defaultMessage="Import file"
          />
        </EuiButton>
      </EuiFlexGroup>
      {isImportFileModalVisible && (
        <UploadPrivilegedUsersModal
          onClose={closeImportFileModal}
          onImport={async (userCount: number) => {
            closeImportFileModal();
            setAddDataSourceResult({ successful: true, userCount });
            await refetch();
          }}
        />
      )}
    </>
  );
};
