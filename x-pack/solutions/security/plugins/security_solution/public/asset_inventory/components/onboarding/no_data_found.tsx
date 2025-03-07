/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiCallOut,
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
import { InventoryTitle } from '../inventory_title';
import { AssetInventoryLoading } from '../asset_inventory_loading';
import illustration from '../../../common/images/integrations_light.png';
import { useNoDataFound } from './hooks/use_no_data_found';

export const NoDataFound = () => {
  const spaceId = useSpaceId();
  const { isCalloutVisible, onHideCallout, renderIntegrationsExplorer } = useNoDataFound();

  if (!spaceId) {
    return <AssetInventoryLoading />;
  }

  return (
    <>
      <InventoryTitle />
      <EuiSpacer size="l" />
      {isCalloutVisible && (
        <>
          <EuiCallOut
            onDismiss={onHideCallout}
            title="Entity Store Installed Successfully"
            color="success"
            iconType="check"
          >
            <p>
              <FormattedMessage
                id="xpack.securitySolution.onboarding.entityStoreInstalledSuccessfully"
                defaultMessage="The Entity Store is now set up and ready to use. You can start managing your assets with enhanced visibility and context, empowering your security team to make informed decisions."
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.startOnboardingAssets"
                  defaultMessage="Start onboarding your assets"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="l" />
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.onboarding.startOnboardingAssetsDescription"
                  defaultMessage="It looks like there's no asset data available yet. To get started, connect your organization's data sources—such as identity providers, cloud service providers, and other IT systems—to populate your inventory with the we discover assets."
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
        {renderIntegrationsExplorer(spaceId)}
      </EuiPanel>
    </>
  );
};
