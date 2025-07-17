/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  getConnectorsManagementHref,
  getElasticManagedLlmConnector,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useGenAIConnectors, useKnowledgeBase } from '@kbn/ai-assistant/src/hooks';
import { useAppContext } from '../../../hooks/use_app_context';
import { useKibana } from '../../../hooks/use_kibana';
import { UISettings } from './ui_settings';
import { ProductDocEntry } from './product_doc_entry';
import { ChangeKbModel } from './change_kb_model';

const GoToSpacesButton = ({ getUrlForSpaces }: { getUrlForSpaces: () => string }) => {
  return (
    <EuiButton
      iconType="popout"
      iconSide="right"
      data-test-subj="settingsTabGoToSpacesButton"
      href={getUrlForSpaces()}
      target="_blank"
      rel="noopener noreferrer"
    >
      {i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.goToSpacesButtonLabel',
        { defaultMessage: 'Go to spaces' }
      )}
    </EuiButton>
  );
};

export function SettingsTab() {
  const {
    application: { getUrlForApp },
    productDocBase,
    http,
    docLinks,
  } = useKibana().services;

  const { config } = useAppContext();

  const knowledgeBase = useKnowledgeBase();
  const connectors = useGenAIConnectors();

  const elasticManagedLlm = getElasticManagedLlmConnector(connectors.connectors);

  const getUrlForSpaces = () => {
    return getUrlForApp('management', {
      path: '/kibana/spaces',
    });
  };

  return (
    <EuiPanel hasBorder grow={false}>
      {config.spacesEnabled && (
        <EuiDescribedFormGroup
          fullWidth
          title={
            <h3>
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.showAIAssistantButtonLabel',
                {
                  defaultMessage:
                    'Show AI Assistant button and Contextual Insights in Observability apps',
                }
              )}
            </h3>
          }
          description={
            <p>
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.showAIAssistantDescriptionLabel',
                {
                  defaultMessage:
                    'Toggle the AI Assistant button and Contextual Insights on or off in Observability apps by checking or unchecking the AI Assistant feature in Spaces > <your space> > Features.',
                  ignoreTag: true,
                }
              )}
            </p>
          }
        >
          <EuiFormRow fullWidth>
            <GoToSpacesButton getUrlForSpaces={getUrlForSpaces} />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      )}

      <EuiDescribedFormGroup
        fullWidth
        title={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="sparkles" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.observabilityAiAssistantManagement.settingsPage.aiConnectorLabel',
                    { defaultMessage: 'AI Connector' }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={
          !!elasticManagedLlm ? (
            <p>
              <FormattedMessage
                id="xpack.observabilityAiAssistantManagement.settingsPage.aiConnectorDescriptionWithLink"
                defaultMessage={`Elastic AI Assistant and other AI features are powered by an LLM. The Elastic Managed LLM connector is used by default ({link}) when no custom connectors are available. Select "Manage connectors" to configure and use a custom connector.`}
                values={{
                  link: (
                    <EuiLink
                      data-test-subj="observabilityAiAssistantManagementSettingsTabAdditionalCostsIncurLink"
                      href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.observabilityAiAssistantManagement.settingsPage.additionalCostsLink',
                        { defaultMessage: 'additional costs incur' }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          ) : (
            <p>
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.aiConnectorDescription',
                {
                  defaultMessage:
                    'A large language model (LLM) is required to power the AI Assistant and AI-driven features in Elastic. In order to use the AI Assistant you must set up a Generative AI connector.',
                }
              )}
            </p>
          )
        }
      >
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="popout"
                iconSide="right"
                data-test-subj="settingsTabGoToConnectorsButton"
                href={getConnectorsManagementHref(http!)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.goToConnectorsButtonLabel',
                  { defaultMessage: 'Manage connectors' }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {productDocBase ? <ProductDocEntry knowledgeBase={knowledgeBase} /> : undefined}

      {knowledgeBase.status.value?.enabled && connectors.connectors?.length ? (
        <ChangeKbModel knowledgeBase={knowledgeBase} />
      ) : undefined}

      <UISettings knowledgeBase={knowledgeBase} />
    </EuiPanel>
  );
}
