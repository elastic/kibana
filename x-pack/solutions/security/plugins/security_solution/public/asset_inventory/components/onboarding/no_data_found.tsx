/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { AssetInventoryTitle } from '../asset_inventory_title';
import { AssetInventoryLoading } from '../asset_inventory_loading';
import illustration from '../../../common/images/integrations_light.png';
import { TEST_SUBJ_ONBOARDING_NO_DATA_FOUND } from '../../constants';
import { SecurityIntegrations } from '../../../common/lib/integrations/components';
import { IntegrationContextProvider } from '../../../common/lib/integrations/hooks/integration_context';

export const NoDataFound = () => {
  const spaceId = useSpaceId();

  if (!spaceId) {
    return <AssetInventoryLoading />;
  }

  return (
    <>
      <AssetInventoryTitle />
      <EuiSpacer size="l" />
      <EuiPanel data-test-subj={TEST_SUBJ_ONBOARDING_NO_DATA_FOUND}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.startOnboardingAssets"
                  defaultMessage="Connect Sources to Discover Assets"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="l" />
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.startOnboardingAssetsDescription"
                  defaultMessage="It looks like there's no asset data available yet. To get started, connect your organization's data sources—such as identity providers, cloud service providers, and other IT systems—to populate your asset inventory."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiImage
              url={illustration}
              size={207}
              alt={i18n.translate(
                'xpack.securitySolution.assetInventory.emptyState.integrationsIllustrationAlt',
                { defaultMessage: 'Explore integrations' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <IntegrationContextProvider spaceId={spaceId}>
          <SecurityIntegrations />
        </IntegrationContextProvider>
      </EuiPanel>
    </>
  );
};
