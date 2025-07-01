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
  EuiImage,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AssetInventoryTitle } from '../asset_inventory_title';
import { CenteredWrapper } from './centered_wrapper';
import { TEST_SUBJ_ONBOARDING_NO_DATA_FOUND } from '../../constants';
import illustration from '../../../common/images/integrations_light.png';
import { useAddIntegrationPath } from './hooks/use_add_integration_path';

export const NoDataFound = () => {
  const { addIntegrationPath, isLoading } = useAddIntegrationPath();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <AssetInventoryTitle />
        <CenteredWrapper>
          <EuiEmptyPrompt
            data-test-subj={TEST_SUBJ_ONBOARDING_NO_DATA_FOUND}
            icon={
              <EuiImage
                url={illustration}
                size="fullWidth"
                alt={i18n.translate(
                  'xpack.securitySolution.assetInventory.emptyState.integrationsIllustrationAlt',
                  { defaultMessage: 'Explore integrations' }
                )}
              />
            }
            layout="horizontal"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.startOnboardingAssets"
                  defaultMessage="Connect Sources to Discover Assets"
                />
              </h2>
            }
            color="plain"
            body={
              <FormattedMessage
                id="xpack.securitySolution.onboarding.startOnboardingAssetsDescription"
                defaultMessage="It looks like there's no asset data available yet. To get started, connect your organization's data sources—such as identity providers, cloud service providers, and other IT systems—to populate your asset inventory."
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
