/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCopy,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useOnboardingCredentials } from '@kbn/vectordb-onboarding';
import { useKibana } from '../hooks/use_kibana';
import { NewConversationPrompt } from './new_conversation_prompt';
import { formatBytes, formatNumber, useDeploymentStats } from './use_deployment_stats';

const StatTile: React.FC<{ label: string; value: string; isLoading: boolean }> = ({
  label,
  value,
  isLoading,
}) => (
  <EuiPanel hasBorder paddingSize="m">
    <EuiStat
      title={isLoading ? <EuiLoadingSpinner size="m" /> : value}
      description={label}
      titleSize="m"
      reverse
    />
  </EuiPanel>
);

export const HomePage: React.FC = () => {
  const {
    services: { application },
  } = useKibana();
  const { stats, isLoading } = useDeploymentStats();
  const elasticsearchUrl = stats.elasticsearchUrl ?? '';
  const { apiKey, isLoading: isApiKeyLoading } = useOnboardingCredentials();

  const goToApiKeys = () =>
    application.navigateToApp('management', { path: '/security/api_keys/create' });

  return (
    <EuiPageTemplate restrictWidth="1100px" panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiTitle size="l">
          <h1>
            {i18n.translate('xpack.serverlessVectordb.home.heading', {
              defaultMessage: 'Vector DB',
            })}
          </h1>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText color="subdued" size="s">
          <p>
            {i18n.translate('xpack.serverlessVectordb.home.subheading', {
              defaultMessage: 'Your project at a glance.',
            })}
          </p>
        </EuiText>

        <EuiSpacer size="xl" />

        <EuiFlexGrid columns={3} gutterSize="m">
          <StatTile
            label={i18n.translate('xpack.serverlessVectordb.home.stats.vectors', {
              defaultMessage: 'Vector documents',
            })}
            value={formatNumber(stats.vectorDocsCount)}
            isLoading={isLoading}
          />
          <StatTile
            label={i18n.translate('xpack.serverlessVectordb.home.stats.indices', {
              defaultMessage: 'Indices',
            })}
            value={formatNumber(stats.indicesCount)}
            isLoading={isLoading}
          />
          <StatTile
            label={i18n.translate('xpack.serverlessVectordb.home.stats.storage', {
              defaultMessage: 'Storage',
            })}
            value={formatBytes(stats.storeSizeBytes)}
            isLoading={isLoading}
          />
          <StatTile
            label={i18n.translate('xpack.serverlessVectordb.home.stats.agents', {
              defaultMessage: 'Agents',
            })}
            value={formatNumber(stats.agentsCount)}
            isLoading={isLoading}
          />
          <StatTile
            label={i18n.translate('xpack.serverlessVectordb.home.stats.workflows', {
              defaultMessage: 'Workflows',
            })}
            value={formatNumber(stats.workflowsCount)}
            isLoading={isLoading}
          />
        </EuiFlexGrid>

        <EuiSpacer size="xl" />

        <EuiPanel hasBorder paddingSize="l">
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.serverlessVectordb.home.connect.heading', {
                defaultMessage: 'Connect to your project',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" alignItems="flexEnd">
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <label htmlFor="vectordbHomeEsUrl">
                  {i18n.translate('xpack.serverlessVectordb.home.connect.urlLabel', {
                    defaultMessage: 'Elasticsearch endpoint',
                  })}
                </label>
              </EuiText>
              <EuiSpacer size="xs" />
              {elasticsearchUrl ? (
                <EuiFieldText
                  id="vectordbHomeEsUrl"
                  readOnly
                  value={elasticsearchUrl}
                  data-test-subj="vectordbHomeEsUrl"
                  append={
                    <EuiCopy textToCopy={elasticsearchUrl}>
                      {(copy) => (
                        <EuiButtonEmpty
                          iconType="copyClipboard"
                          size="xs"
                          onClick={copy}
                          aria-label={i18n.translate(
                            'xpack.serverlessVectordb.home.connect.copyUrl',
                            {
                              defaultMessage: 'Copy endpoint URL',
                            }
                          )}
                        />
                      )}
                    </EuiCopy>
                  }
                />
              ) : (
                <EuiText size="s" color="subdued">
                  <EuiCode>—</EuiCode>
                </EuiText>
              )}
            </EuiFlexItem>
            {isApiKeyLoading ? (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            ) : apiKey ? (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  <label htmlFor="vectordbHomeApiKey">
                    {i18n.translate('xpack.serverlessVectordb.home.connect.apiKeyLabel', {
                      defaultMessage: 'API key',
                    })}
                  </label>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiFieldText
                  id="vectordbHomeApiKey"
                  readOnly
                  value={apiKey}
                  data-test-subj="vectordbHomeApiKey"
                  append={
                    <EuiCopy textToCopy={apiKey}>
                      {(copy) => (
                        <EuiButtonEmpty
                          iconType="copyClipboard"
                          size="xs"
                          onClick={copy}
                          aria-label={i18n.translate(
                            'xpack.serverlessVectordb.home.connect.copyApiKey',
                            { defaultMessage: 'Copy API key' }
                          )}
                        />
                      )}
                    </EuiCopy>
                  }
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="key"
                  onClick={goToApiKeys}
                  data-test-subj="vectordbHomeCreateApiKey"
                >
                  {i18n.translate('xpack.serverlessVectordb.home.connect.createApiKey', {
                    defaultMessage: 'Create API key',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="xxl" />
        <NewConversationPrompt />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
