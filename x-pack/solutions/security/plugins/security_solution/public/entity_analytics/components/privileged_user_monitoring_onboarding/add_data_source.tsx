/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIntegrationLinkState } from '../../../common/hooks/integrations/use_integration_link_state';
import { addPathParamToUrl } from '../../../common/utils/integrations';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../../common/constants';
import { useNavigation } from '../../../common/lib/kibana';
import { INTEGRATION_APP_ID } from '../../../onboarding/components/onboarding_body/cards/integrations/constants';
import entraIdIcon from '../../icons/entra_id.svg';
import oktaIcon from '../../icons/okta.svg';
import activeDirectoryIcon from '../../icons/active_directory.svg';

const INTEGRATIONS = [
  {
    id: 'entityanalytics_okta',
    icon: oktaIcon,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.okta.title"
        defaultMessage="Okta"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.okta.description"
        defaultMessage="Collect user identities and event logs from Okta with Elastic Agent."
      />
    ),
  },
  {
    id: 'entityanalytics_entra_id',
    icon: entraIdIcon,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.entra.title"
        defaultMessage="Microsoft Entra ID"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.entra.description"
        defaultMessage="Collect user identities and event logs from Microsoft Entra ID with Elastic Agent."
      />
    ),
  },
  {
    id: 'entityanalytics_ad',
    icon: activeDirectoryIcon,
    title: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.activeDirectory.title"
        defaultMessage="Active Directory"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.addDataSource.activeDirectory.description"
        defaultMessage="Collect user identities from Active Directory with Elastic Agent."
      />
    ),
  },
];

export const AddDataSourcePanel = () => {
  const { navigateTo } = useNavigation();
  const state = useIntegrationLinkState(ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH);

  const navigateToIntegration = useCallback(
    (id: string) => {
      navigateTo({
        appId: INTEGRATION_APP_ID,
        path: addPathParamToUrl(
          `/detail/${id}/overview`,
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

      <EuiFlexGroup direction="row" justifyContent="spaceBetween">
        {INTEGRATIONS.map((integration) => (
          <EuiFlexItem grow={1}>
            <EuiCard
              key={integration.id}
              layout="horizontal"
              icon={<EuiIcon size="xl" type={integration.icon} />}
              title={integration.title}
              description={integration.description}
              onClick={() => {
                navigateToIntegration(integration.id);
              }}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
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
            onClick={() => {}}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiCard
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
