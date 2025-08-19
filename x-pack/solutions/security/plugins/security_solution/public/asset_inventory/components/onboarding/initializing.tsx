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
import { AssetInventoryTitle } from '../asset_inventory_title';
import { CenteredWrapper } from './centered_wrapper';
import { TEST_SUBJ_ONBOARDING_INITIALIZING } from '../../constants';
import { useAddIntegrationPath } from './hooks/use_add_integration_path';

export const Initializing = () => {
  const { addIntegrationPath, isLoading } = useAddIntegrationPath();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <AssetInventoryTitle />
        <CenteredWrapper>
          <EuiEmptyPrompt
            data-test-subj={TEST_SUBJ_ONBOARDING_INITIALIZING}
            icon={<EuiLoadingLogo logo="logoSecurity" size="xl" />}
            title={
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.onboarding.initializing.title"
                  defaultMessage="Discovering Your Assets"
                />
              </h2>
            }
            color="plain"
            body={
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.onboarding.initializing.description"
                defaultMessage="We're currently analyzing your connected data sources to build a comprehensive inventory of your assets. This typically takes just a few minutes to complete. You'll be automatically redirected when your inventory is ready to explore."
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
                            defaultMessage="Explore Asset Discovery Integrations"
                          />
                        </strong>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <FormattedMessage
                          id="xpack.securitySolution.assetInventory.initializing.exploreDescription"
                          defaultMessage="Discover assets across cloud, identity, and other environments for deeper visibility."
                        />
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    iconType="plusInCircle"
                    href={addIntegrationPath}
                    isDisabled={isLoading}
                  >
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
