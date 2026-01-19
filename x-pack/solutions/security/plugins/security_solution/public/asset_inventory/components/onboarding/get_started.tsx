/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiImage,
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import illustration from '../../../common/images/information_light.png';
import { AssetInventoryTitle } from '../asset_inventory_title';
import { CenteredWrapper } from './centered_wrapper';
import { HoverForExplanationTooltip } from './hover_for_explanation_tooltip';
import { EmptyStateIllustrationContainer } from '../empty_state_illustration_container';
import { useEnableAssetInventory } from './hooks/use_enable_asset_inventory';
import { TEST_SUBJ_ONBOARDING_GET_STARTED } from '../../constants';
import { NeedHelp } from './need_help';

export const GetStarted = () => {
  const { isEnabling, error, reset, enableAssetInventory } = useEnableAssetInventory();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <AssetInventoryTitle />
        <CenteredWrapper>
          {error ? (
            <EuiEmptyPrompt
              iconType="error"
              color="danger"
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.errorTitle"
                    defaultMessage="Unable to show your Inventory"
                  />
                </h2>
              }
              body={
                <>
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.errorDescription"
                      defaultMessage="Something went wrong while setting things up. You can try again or go back to Get Started with Inventory."
                    />
                  </p>
                  <EuiFlexGroup direction="column" alignItems="center" gutterSize="m">
                    <EuiFlexItem grow={false}>
                      <EuiButton onClick={enableAssetInventory} fill>
                        <FormattedMessage
                          id="xpack.securitySolution.assetInventory.error.tryAgain"
                          defaultMessage="Try again"
                        />
                      </EuiButton>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty onClick={reset} iconType="arrowLeft" iconSide="left">
                        <FormattedMessage
                          id="xpack.securitySolution.assetInventory.error.backToStart"
                          defaultMessage="Back to Get Started with Inventory"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              }
            />
          ) : (
            <EuiEmptyPrompt
              data-test-subj={TEST_SUBJ_ONBOARDING_GET_STARTED}
              icon={
                <EmptyStateIllustrationContainer>
                  <EuiImage
                    url={illustration}
                    size="fullWidth"
                    alt={i18n.translate(
                      'xpack.securitySolution.assetInventory.emptyState.illustrationAlt',
                      {
                        defaultMessage: 'No results',
                      }
                    )}
                  />
                </EmptyStateIllustrationContainer>
              }
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.onboarding.getStarted.title"
                    defaultMessage="Get Started with Asset Inventory"
                  />
                </h2>
              }
              layout="horizontal"
              color="plain"
              body={
                <>
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.onboarding.getStarted.description"
                      defaultMessage="Asset Inventory provides a unified view of all your organizations assets in one place. See everything detected by Elastic Security — whether from logs, {identity_providers}, {cloud_services}, {mdms} or configuration {databases} — all in a structured, searchable inventory. Enable Asset Inventory to gain complete visibility across your environment."
                      values={{
                        identity_providers: (
                          <HoverForExplanationTooltip
                            content={
                              <FormattedMessage
                                id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.identityProviders.helperText"
                                defaultMessage="Identity providers are services that store and manage user identities."
                              />
                            }
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.identityProviders"
                              defaultMessage="identity providers"
                            />
                          </HoverForExplanationTooltip>
                        ),
                        cloud_services: (
                          <HoverForExplanationTooltip
                            content={
                              <FormattedMessage
                                id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.cloudServices.helperText"
                                defaultMessage="Cloud services are services that provide cloud-based infrastructure, platforms, or software."
                              />
                            }
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.cloudServices"
                              defaultMessage="cloud services"
                            />
                          </HoverForExplanationTooltip>
                        ),
                        mdms: (
                          <HoverForExplanationTooltip
                            content={
                              <FormattedMessage
                                id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.mdms.helperText"
                                defaultMessage="Mobile Device Managers (MDMs) are services that manage mobile devices."
                              />
                            }
                          >
                            <>{'MDMs'}</>
                          </HoverForExplanationTooltip>
                        ),
                        databases: (
                          <HoverForExplanationTooltip
                            content={
                              <FormattedMessage
                                id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.databases.helperText"
                                defaultMessage="Databases are services that store and manage data."
                              />
                            }
                          >
                            <FormattedMessage
                              id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.databases"
                              defaultMessage="databases"
                            />
                          </HoverForExplanationTooltip>
                        ),
                      }}
                    />
                  </p>
                </>
              }
              actions={[
                <EuiButton
                  color="primary"
                  fill
                  onClick={enableAssetInventory}
                  iconType="plusInCircle"
                  isLoading={isEnabling}
                >
                  {isEnabling ? (
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.emptyState.enableAssetInventory.loading"
                      defaultMessage="Enabling Asset Inventory"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.emptyState.enableAssetInventory"
                      defaultMessage="Enable Asset Inventory"
                    />
                  )}
                </EuiButton>,
              ]}
              footer={<NeedHelp />}
            />
          )}
        </CenteredWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
