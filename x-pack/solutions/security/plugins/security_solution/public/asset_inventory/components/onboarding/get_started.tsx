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
  EuiLink,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import illustration from '../../../common/images/information_light.png';
import { InventoryTitle } from '../inventory_title';
import { CenteredWrapper } from './centered_wrapper';
import { HoverForExplanationTooltip } from './hover_for_explanation_tooltip';
import { EmptyStateIllustrationContainer } from '../empty_state_illustration_container';
import { useEnableAssetInventory } from './hooks/use_enable_asset_inventory';
import { TEST_SUBJ_ONBOARDING_GET_STARTED } from '../../constants';

const ASSET_INVENTORY_DOCS_URL = 'https://ela.st/asset-inventory';

export const GetStarted = () => {
  const { isEnabling, error, reset, enableAssetInventory } = useEnableAssetInventory();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <InventoryTitle />
        <CenteredWrapper>
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
                    defaultMessage="Asset Inventory gives you a unified view of all assets detected by Elastic Security, including those observed in logs, events, or discovered through integrations with sources like {identity_providers}, {cloud_services}, {mdms}, and configuration management {databases}."
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
                {error && (
                  <EuiCallOut
                    onDismiss={reset}
                    title={
                      <FormattedMessage
                        id="xpack.securitySolution.assetInventory.onboarding.getStarted.errorTitle"
                        defaultMessage="Sorry, there was an error"
                      />
                    }
                    color="danger"
                    iconType="error"
                  >
                    <p>{error}</p>
                  </EuiCallOut>
                )}
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
            footer={
              <>
                <EuiTitle size="xxs">
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.emptyState.needHelp"
                      defaultMessage="Need help?"
                    />
                  </strong>
                </EuiTitle>{' '}
                <EuiLink href={ASSET_INVENTORY_DOCS_URL} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.emptyState.readDocumentation"
                    defaultMessage="Read documentation"
                  />
                </EuiLink>
              </>
            }
          />
        </CenteredWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
