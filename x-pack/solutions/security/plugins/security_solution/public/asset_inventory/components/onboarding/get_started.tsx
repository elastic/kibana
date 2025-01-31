/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, EuiEmptyPrompt, EuiButton, EuiLink, useEuiTheme, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import illustration from '../../../common/images/information_light.png';
import { OnboardingTitle } from './onboarding_title';

const ASSET_INVENTORY_DOCS_URL = 'https://ela.st/asset-inventory';
const TEST_SUBJ = 'assetInventory:onboarding:get-started';

const TextUnderlineDotted = ({ children }: { children: React.ReactNode }) => (
  <u
    css={css`
      text-decoration: underline;
      text-decoration-style: dotted;
    `}
  >
    {children}
  </u>
);

export const GetStarted = ({ docsUrl = ASSET_INVENTORY_DOCS_URL }: { docsUrl?: string }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <OnboardingTitle />
      <EuiEmptyPrompt
        css={css`
        max-width: 734px;
        && > .euiEmptyPrompt__main {
          gap: ${euiTheme.size.xl};
        }
        && {
          margin-top: ${euiTheme.size.xxxl}};
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
                    <TextUnderlineDotted>
                      <FormattedMessage
                        id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.identityProviders"
                        defaultMessage="identity providers"
                      />
                    </TextUnderlineDotted>
                  ),
                  cloud_services: (
                    <TextUnderlineDotted>
                      <FormattedMessage
                        id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.cloudServices"
                        defaultMessage="cloud services"
                      />
                    </TextUnderlineDotted>
                  ),
                  mdms: <TextUnderlineDotted>{'MDMs'}</TextUnderlineDotted>,
                  databases: (
                    <TextUnderlineDotted>
                      <FormattedMessage
                        id="xpack.securitySolution.assetInventory.onboarding.getStarted.description.databases"
                        defaultMessage="databases"
                      />
                    </TextUnderlineDotted>
                  ),
                }}
              />
            </p>
          </>
        }
        actions={[
          <EuiButton color="primary" fill onClick={() => {}} iconType="plusInCircle">
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.emptyState.resetFiltersButton"
              defaultMessage="Enable Asset Inventory"
            />
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
            <EuiLink href={docsUrl} target="_blank">
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.emptyState.readDocumentation"
                defaultMessage="Read documentation"
              />
            </EuiLink>
          </>
        }
      />
    </>
  );
};
