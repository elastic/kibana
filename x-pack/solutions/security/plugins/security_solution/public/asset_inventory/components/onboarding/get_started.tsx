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
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import illustration from '../../../common/images/information_light.png';
import { Title } from '../title';
import { CenteredWrapper } from './centered_wrapper';
import { HoverForExplanation } from './hover_for_explanation';
import { useGetStarted } from './hooks/use_get_started';

const ASSET_INVENTORY_DOCS_URL = 'https://ela.st/asset-inventory';
const TEST_SUBJ = 'assetInventory:onboarding:get-started';

export const GetStarted = () => {
  const { euiTheme } = useEuiTheme();
  const { isEnabling, error, setError, handleEnableClick } = useGetStarted();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <Title />
        <CenteredWrapper>
          <EuiEmptyPrompt
            css={css`
              && > .euiEmptyPrompt__main {
                gap: ${euiTheme.size.xxl};
              }
            `}
            data-test-subj={TEST_SUBJ}
            icon={
              <EuiImage
                url={illustration}
                alt={i18n.translate(
                  'xpack.securitySolution.assetInventory.emptyState.illustrationAlt',
                  {
                    defaultMessage: 'No results',
                  }
                )}
                css={css`
                  width: 380px;
                `}
              />
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
                        <HoverForExplanation
                          tooltipContent={
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
                        </HoverForExplanation>
                      ),
                      cloud_services: (
                        <HoverForExplanation
                          tooltipContent={
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
                        </HoverForExplanation>
                      ),
                      mdms: (
                        <HoverForExplanation
                          tooltipContent={
                            <FormattedMessage
                              id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.mdms.helperText"
                              defaultMessage="Mobile Device Managers (MDMs) are services that manage mobile devices."
                            />
                          }
                        >
                          {'MDMs'}
                        </HoverForExplanation>
                      ),
                      databases: (
                        <HoverForExplanation
                          tooltipContent={
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
                        </HoverForExplanation>
                      ),
                    }}
                  />
                </p>
                {error && (
                  <EuiCallOut
                    onDismiss={() => setError(null)}
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
                onClick={handleEnableClick}
                iconType="plusInCircle"
                isLoading={isEnabling}
              >
                {isEnabling ? (
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.emptyState.resetFiltersButton.loading"
                    defaultMessage="Enabling Asset Inventory"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.emptyState.resetFiltersButton"
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
