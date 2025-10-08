/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { IndexSelectorModal } from './select_index_modal';
import { UploadPrivilegedUsersModal } from './file_uploader/upload_privileged_users_modal';
import { IntegrationCards } from './integrations_cards';

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
            defaultMessage="Add data source for your privileged users"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="m">
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.description"
            defaultMessage="To get started, define your privileged users by selecting an index with user data or importing your list of privileged users from a supported file."
          />
        </p>
      </EuiText>

      <EuiSpacer size="xl" />

      <Suspense
        fallback={
          <EuiFlexGrid gutterSize="l" columns={2}>
            {Array.from({ length: 2 }).map((_, index) => (
              <EuiFlexItem grow={1} key={index}>
                <EuiSkeletonRectangle height="85px" width="100%" />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        }
      >
        <IntegrationCards onIntegrationInstalled={onComplete} />
      </Suspense>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceAround" responsive={false}>
        <EuiFlexItem grow={true}>
          <EuiHorizontalRule size="full" margin="none" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.or"
            defaultMessage="OR"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiHorizontalRule size="full" margin="none" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        <EuiFlexItem grow={1}>
          <EuiCard
            data-test-subj="privilegedUserMonitoringAddIndexCard"
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
            data-test-subj="privilegedUserMonitoringImportCSVCard"
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
