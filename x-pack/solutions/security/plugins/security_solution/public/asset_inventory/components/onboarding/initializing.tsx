/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingLogo,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { useKibana } from '../../../common/lib/kibana';
import { InventoryTitle } from '../inventory_title';
import { CenteredWrapper } from './centered_wrapper';
import { TEST_SUBJ_ONBOARDING_INITIALIZING } from '../../constants';

export const Initializing = () => {
  const { application } = useKibana().services;

  const onAddIntegrationClick = () => application.navigateToApp(INTEGRATIONS_PLUGIN_ID);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <InventoryTitle />
        <CenteredWrapper>
          <EuiEmptyPrompt
            data-test-subj={TEST_SUBJ_ONBOARDING_INITIALIZING}
            icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
            title={
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.onboarding.initializing.title"
                  defaultMessage="Initializing Asset Inventory"
                />
              </h2>
            }
            color="plain"
            body={
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.onboarding.initializing.description"
                defaultMessage="Your Asset Inventory is being set up. This may take a few moments as we prepare to provide you with centralized visibility into your assets. Check back shortly to start exploring your assets."
              />
            }
            footer={
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="fleetApp" size="xl" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="none">
                    <EuiFlexItem>
                      <EuiTitle size="xxs">
                        <strong>
                          <FormattedMessage
                            id="xpack.securitySolution.assetInventory.initializing.exploreTitle"
                            defaultMessage="Explore Asset Integrations"
                          />
                        </strong>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.securitySolution.assetInventory.initializing.exploreDescription"
                          defaultMessage="Explore the out-of-the-box integrations we provide to connect your data sources."
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" iconType="plusInCircle" onClick={onAddIntegrationClick}>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.initializing.addIntegration"
                      defaultMessage="Add integration"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </CenteredWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
