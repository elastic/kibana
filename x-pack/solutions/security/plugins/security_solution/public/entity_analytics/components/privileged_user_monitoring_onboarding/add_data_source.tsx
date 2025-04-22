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
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { IndexSelectorModal } from './select_index_modal';
import { IntegrationCards } from './integrations_cards';

export const AddDataSourcePanel = () => {
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);

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
            defaultMessage="To get started, define your privileged users by adding an integration with your organization’s user identities, select an index with the relevant data, or import your list of privileged users from a CSV file."
          />
        </p>
      </EuiText>

      <EuiSpacer size="xl" />
      <Suspense
        fallback={
          <EuiFlexGrid gutterSize="l" columns={3}>
            {Array.from({ length: 3 }).map((_, index) => (
              <EuiFlexItem grow={1} key={index}>
                <EuiSkeletonRectangle height="127px" width="100%" />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        }
      >
        <IntegrationCards />
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
            onClick={() => {
              setIsIndexModalOpen(true);
            }}
          />
          <IndexSelectorModal
            isOpen={isIndexModalOpen}
            onClose={() => {
              setIsIndexModalOpen(false);
            }}
          />
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
                defaultMessage="Import a list of privileged users from a CSV, TXT, or TSV file"
              />
            }
            onClick={() => {}}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
