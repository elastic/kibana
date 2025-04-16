/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
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
import { PackageCard } from '@kbn/fleet-plugin/public';
import { useIntegrationLinkState } from '../../../common/hooks/integrations/use_integration_link_state';
import { addPathParamToUrl } from '../../../common/utils/integrations';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../common/constants';
import { useNavigation } from '../../../common/lib/kibana';
import { INTEGRATION_APP_ID } from '../../../onboarding/components/onboarding_body/cards/integrations/constants';
import { IndexSelectorModal } from './select_index_modal';
import { useEntityAnalyticsIntegrations } from './hooks/use_integrations';

export const AddDataSourcePanel = () => {
  const { navigateTo } = useNavigation();
  const state = useIntegrationLinkState(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH);
  const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);
  const { integrations, isLoading } = useEntityAnalyticsIntegrations();

  const navigateToIntegration = useCallback(
    (id: string, version: string) => {
      navigateTo({
        appId: INTEGRATION_APP_ID,
        path: addPathParamToUrl(
          `/detail/${id}-${version}/overview`,
          ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
        ),
        state,
      });
    },
    [navigateTo, state]
  );

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
      {isLoading ? (
        <EuiFlexGrid gutterSize="l" columns={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <EuiFlexItem grow={1} key={index}>
              <EuiSkeletonRectangle height="136px" width="100%" />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      ) : (
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          {integrations.map(({ name, title, icons, description, version }) => (
            <EuiFlexItem grow={1} key={name}>
              <PackageCard
                description={description ?? ''}
                icons={icons ?? []}
                id={name}
                name={name}
                title={title}
                version={version}
                onCardClick={() => {
                  navigateToIntegration(name, version);
                }}
                // Required values that don't make sense for this scenario
                categories={[]}
                integration={''}
                url={''}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
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
