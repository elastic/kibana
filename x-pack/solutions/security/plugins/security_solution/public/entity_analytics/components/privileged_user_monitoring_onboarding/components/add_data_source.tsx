/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { IndexSelectorModal } from './select_index_modal';
import { UploadPrivilegedUsersModal } from './file_uploader/upload_privileged_users_modal';

interface AddDataSourcePanelProps {
  onComplete: (userCount: number) => void;
}

export const AddDataSourcePanel = ({ onComplete }: AddDataSourcePanelProps) => {
  const [isIndexModalOpen, { on: showIndexModal, off: hideIndexModal }] = useBoolean(false);

  const [isImportFileModalVisible, setShowImportFileModal] = useState(false);
  const closeImportFileModal = () => setShowImportFileModal(false);
  const showImportFileModal = () => setShowImportFileModal(true);

  return (
    <EuiPanel paddingSize="xl" hasShadow={false} hasBorder={false}>
      <EuiTitle>
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.title"
            defaultMessage="Add data source of your privileged users"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="m">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.description"
            defaultMessage="To get started, define your privileged users by selecting an index with the relevant data, or importing your list of privileged users from a CSV file."
          />
        </p>
      </EuiText>

      <EuiSpacer size="xl" />
      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        <EuiFlexItem grow={1}>
          <EuiCard
            hasBorder
            layout="horizontal"
            icon={<EuiIcon size="l" type="indexOpen" />}
            titleSize="xs"
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.index.title"
                defaultMessage="Index"
              />
            }
            description={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.index.description"
                defaultMessage="Select an index that contains relevant user activity data"
              />
            }
            onClick={showIndexModal}
          />
          {isIndexModalOpen && (
            <IndexSelectorModal onClose={hideIndexModal} onImport={onComplete} />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiCard
            hasBorder
            layout="horizontal"
            icon={<EuiIcon size="l" type="importAction" />}
            titleSize="xs"
            title={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.file.title"
                defaultMessage="File"
              />
            }
            description={
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.file.description"
                defaultMessage="Import a list of privileged users from a CSV file"
              />
            }
            onClick={showImportFileModal}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isImportFileModalVisible && (
        <UploadPrivilegedUsersModal onClose={closeImportFileModal} onImport={onComplete} />
      )}
    </EuiPanel>
  );
};
