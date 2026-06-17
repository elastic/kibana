/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useState } from 'react';
import type { ObservabilityOnboardingAppServices } from '../..';
import { LogoIcon } from '../shared/logo_icon';
import { ApiKeyField } from './api_key_field';
import { EndpointField } from './endpoint_field';
import { useApiEndpoints } from './use_api_endpoints';
import { useApiKeys } from './use_api_keys';

const LEARN_MORE_LINK = 'https://ela.st/connect-deployment-endpoints';

export const ApiEndpoints = () => {
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const titleId = useGeneratedHtmlId({ prefix: 'apiEndpointsTitle' });
  const isMobile = useIsWithinBreakpoints(['xs', 's']);

  const { endpoints, isLoading } = useApiEndpoints();
  const { encodedApiKeys, creatingEndpointId, createApiKey } = useApiKeys();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | undefined>(undefined);
  const [apiKeysManagementUrl, setApiKeysManagementUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const locator = share.url.locators.get('MANAGEMENT_APP_LOCATOR');
    locator?.getUrl({ sectionId: 'security', appId: 'api_keys' }).then(setApiKeysManagementUrl);
  }, [share.url.locators]);

  if (endpoints.length === 0) {
    return null;
  }

  const selectedEndpoint =
    endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? endpoints[0];

  const toggleLabel = i18n.translate(
    'xpack.observability_onboarding.apiEndpoints.toggleAriaLabel',
    { defaultMessage: 'Toggle API endpoints' }
  );

  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <section aria-labelledby={titleId}>
        <EuiTitle size="s">
          <h3 id={titleId}>
            {i18n.translate('xpack.observability_onboarding.apiEndpoints.title', {
              defaultMessage: 'Connect directly to the endpoint',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.observability_onboarding.apiEndpoints.subtitle"
              defaultMessage="Access your deployment's endpoints and API keys directly. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={LEARN_MORE_LINK}
                    target="_blank"
                    external
                    data-test-subj="observabilityOnboardingApiEndpointsLearnMore"
                  >
                    {i18n.translate('xpack.observability_onboarding.apiEndpoints.learnMore', {
                      defaultMessage: 'Learn more',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <EuiFlexGroup gutterSize="s" direction={isMobile ? 'column' : 'row'} responsive={false}>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType={isOpen ? 'arrowDown' : 'arrowRight'}
                      color="text"
                      onClick={() => setIsOpen((open) => !open)}
                      aria-expanded={isOpen}
                      aria-label={toggleLabel}
                      data-test-subj="observabilityOnboardingApiEndpointsToggle"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem css={{ minWidth: 0 }}>
                  <EuiTabs bottomBorder={false}>
                    {endpoints.map((endpoint) => (
                      <EuiTab
                        key={endpoint.id}
                        isSelected={endpoint.id === selectedEndpoint.id}
                        onClick={() => {
                          setSelectedEndpointId(endpoint.id);
                          setIsOpen(true);
                        }}
                        prepend={
                          <LogoIcon
                            logo={endpoint.logo}
                            euiIconType={endpoint.euiIconType}
                            size="m"
                          />
                        }
                        data-test-subj={`observabilityOnboardingApiEndpointTab-${endpoint.id}`}
                      >
                        {endpoint.label}
                      </EuiTab>
                    ))}
                  </EuiTabs>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                href={apiKeysManagementUrl}
                css={isMobile ? { width: '100%' } : undefined}
                data-test-subj="observabilityOnboardingApiEndpointsOpenInApiKeys"
              >
                {i18n.translate('xpack.observability_onboarding.apiEndpoints.openInApiKeys', {
                  defaultMessage: 'Open in API keys',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          {isOpen && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup
                direction={isMobile ? 'column' : 'row'}
                gutterSize="m"
                responsive={false}
              >
                <EuiFlexItem>
                  <EndpointField url={selectedEndpoint.url} isLoading={isLoading} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ApiKeyField
                    encodedApiKey={encodedApiKeys[selectedEndpoint.id]}
                    isCreating={creatingEndpointId === selectedEndpoint.id}
                    onCreate={() => createApiKey(selectedEndpoint.id)}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </EuiPanel>
      </section>
    </>
  );
};
