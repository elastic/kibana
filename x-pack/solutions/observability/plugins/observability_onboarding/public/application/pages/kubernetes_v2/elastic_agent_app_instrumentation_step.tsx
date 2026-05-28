/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonGroup,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { KubernetesV2CardOption } from './kubernetes_v2_card_selector';
import { KubernetesV2CardSelector } from './kubernetes_v2_card_selector';

type ElasticAgentAppInstrumentationChoice = 'yes' | 'no';
type ElasticApmLanguageId = 'nodejs' | 'java' | 'python' | 'dotnet' | 'go' | 'ruby' | 'php';

const ELASTIC_APM_AGENT_DOCS_BY_LANGUAGE = {
  nodejs: 'https://www.elastic.co/docs/reference/apm/agents/nodejs',
  java: 'https://www.elastic.co/docs/reference/apm/agents/java',
  python: 'https://www.elastic.co/docs/reference/apm/agents/python',
  dotnet: 'https://www.elastic.co/docs/reference/apm/agents/dotnet',
  go: 'https://www.elastic.co/docs/reference/apm/agents/go',
  ruby: 'https://www.elastic.co/docs/reference/apm/agents/ruby',
  php: 'https://www.elastic.co/docs/reference/apm/agents/php',
} as const;

const ELASTIC_APM_AGENT_DOCS_LABEL_BY_LANGUAGE = {
  nodejs: 'nodejs',
  java: 'java',
  python: 'python',
  dotnet: '.NET',
  go: 'go',
  ruby: 'ruby',
  php: 'php',
} as const;

const INSTRUMENTATION_OPTIONS: Array<KubernetesV2CardOption<ElasticAgentAppInstrumentationChoice>> =
  [
    {
      id: 'yes',
      label: i18n.translate(
        'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.yesCardLabel',
        { defaultMessage: 'Yes' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.yesCardDescription',
        {
          defaultMessage:
            'Add APM agents or the OTel SDK to capture traces and application metrics.',
        }
      ),
    },
    {
      id: 'no',
      label: i18n.translate(
        'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.noCardLabel',
        { defaultMessage: 'No, infrastructure only' }
      ),
      description: i18n.translate(
        'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.noCardDescription',
        { defaultMessage: 'Skip app instrumentation and collect only logs and infra metrics.' }
      ),
    },
  ];

const APM_LANGUAGE_OPTIONS: Array<{ id: ElasticApmLanguageId; label: string }> = [
  {
    id: 'nodejs',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.nodejsLanguageLabel',
      { defaultMessage: 'Node.js' }
    ),
  },
  {
    id: 'java',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.javaLanguageLabel',
      { defaultMessage: 'Java' }
    ),
  },
  {
    id: 'python',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.pythonLanguageLabel',
      { defaultMessage: 'Python' }
    ),
  },
  {
    id: 'dotnet',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.dotnetLanguageLabel',
      { defaultMessage: '.NET' }
    ),
  },
  {
    id: 'go',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.goLanguageLabel',
      { defaultMessage: 'Go' }
    ),
  },
  {
    id: 'ruby',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.rubyLanguageLabel',
      { defaultMessage: 'Ruby' }
    ),
  },
  {
    id: 'php',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.phpLanguageLabel',
      { defaultMessage: 'PHP' }
    ),
  },
];

export const ElasticAgentAppInstrumentationStep: React.FC = () => {
  const [instrumentationChoice, setInstrumentationChoice] =
    useState<ElasticAgentAppInstrumentationChoice>('no');
  const [apmServerUrl, setApmServerUrl] = useState('');
  const [languageId, setLanguageId] = useState<ElasticApmLanguageId>('nodejs');

  return (
    <>
      <KubernetesV2CardSelector
        legend={i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.choiceLegend',
          { defaultMessage: 'Instrument your application with Elastic APM' }
        )}
        selectedId={instrumentationChoice}
        options={INSTRUMENTATION_OPTIONS}
        onChange={setInstrumentationChoice}
        dataTestSubjPrefix="observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentation"
      />

      {instrumentationChoice === 'yes' ? (
        <>
          <EuiSpacer />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.apmEndpointTitle',
                { defaultMessage: 'APM endpoint' }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.apmServerUrlLabel',
              { defaultMessage: 'APM Server URL' }
            )}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={apmServerUrl}
              onChange={(event) => setApmServerUrl(event.target.value)}
              placeholder="https://my-deployment.apm.io:8200"
              data-test-subj="observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationApmServerUrlInput"
            />
          </EuiFormRow>
          <EuiSpacer />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.languageTitle',
                { defaultMessage: 'Select language agent' }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.languageSelectorLegend',
              { defaultMessage: 'Select a programming language' }
            )}
            idSelected={languageId}
            onChange={(optionId) => setLanguageId(optionId as ElasticApmLanguageId)}
            options={APM_LANGUAGE_OPTIONS}
            data-test-subj="observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationLanguageSelector"
          />
          <EuiSpacer />
          <p>
            <FormattedMessage
              id="xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.docsMessage"
              defaultMessage="Follow the {link} to instrument your application."
              values={{
                link: (
                  <EuiLink
                    href={ELASTIC_APM_AGENT_DOCS_BY_LANGUAGE[languageId]}
                    data-test-subj="observabilityOnboardingKubernetesV2ElasticAgentAppInstrumentationDocsLink"
                    target="_blank"
                    external
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.kubernetesV2.elasticAgentAppInstrumentation.docsLinkLabel',
                      {
                        defaultMessage: 'Elastic APM {language} agent docs',
                        values: {
                          language: ELASTIC_APM_AGENT_DOCS_LABEL_BY_LANGUAGE[languageId],
                        },
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </>
      ) : null}
    </>
  );
};
