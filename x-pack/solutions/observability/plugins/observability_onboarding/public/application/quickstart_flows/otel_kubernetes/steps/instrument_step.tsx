/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiLink,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { OTEL_STACK_NAMESPACE } from '../constants';

export const OtelKubernetesInstrumentStep: React.FC = () => {
  const [idSelected, setIdSelected] = useState('nodejs');
  const theme = useEuiTheme();

  return (
    <>
      <p>
        {i18n.translate(
          'xpack.observability_onboarding.otelKubernetesPanel.theOperatorAutomatesTheLabel',
          {
            defaultMessage:
              'The Operator automates the injection of auto-instrumentation libraries into the annotated pods for some languages.',
          }
        )}
      </p>
      <EuiSpacer />
      <EuiButtonGroup
        legend={i18n.translate(
          'xpack.observability_onboarding.otelKubernetesPanel.selectProgrammingLanguageLegend',
          {
            defaultMessage: 'Select a programming language',
          }
        )}
        idSelected={idSelected}
        onChange={(optionId) => setIdSelected(optionId)}
        options={[
          {
            id: 'nodejs',
            label: 'Node.js',
          },
          {
            id: 'java',
            label: 'Java',
          },
          {
            id: 'python',
            label: 'Python',
          },
          {
            id: 'dotnet',
            label: '.NET',
          },
          {
            id: 'go',
            label: 'Go',
          },
        ]}
      />
      <EuiSpacer />
      <p
        css={css`
          font-weight: ${theme.euiTheme.font.weight.bold};
        `}
      >
        {i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.step3a.title', {
          defaultMessage: '3(a) - Start with one of these annotations methods:',
        })}
      </p>
      <EuiSpacer />
      <EuiAccordion
        id={'otelKubernetesAccordionSingleDeployment'}
        paddingSize="s"
        buttonContent={i18n.translate(
          'xpack.observability_onboarding.otelKubernetesPanel.annotation.deployment',
          {
            defaultMessage: 'Annotate specific deployment Pods modifying its manifest',
          }
        )}
      >
        <EuiCodeBlock paddingSize="m" language="yaml" isCopyable={true}>
          {`apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  ...
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-${idSelected}: "${OTEL_STACK_NAMESPACE}/elastic-instrumentation"
      ...
    spec:
      containers:
      - image: myapplication-image
        name: app
      ...`}
        </EuiCodeBlock>
      </EuiAccordion>
      <EuiSpacer />
      <EuiAccordion
        id={'otelKubernetesAccordionAllResources'}
        paddingSize="s"
        buttonContent={i18n.translate(
          'xpack.observability_onboarding.otelKubernetesPanel.annotation.resources',
          { defaultMessage: 'Annotate all resources in a namespace' }
        )}
      >
        <EuiCodeBlock
          paddingSize="m"
          language="bash"
          isCopyable={true}
          data-test-subj="observabilityOnboardingOtelKubernetesPanelAnnotateAllResourcesSnippet"
        >
          {`kubectl annotate namespace my-namespace instrumentation.opentelemetry.io/inject-${idSelected}="${OTEL_STACK_NAMESPACE}/elastic-instrumentation"`}
        </EuiCodeBlock>
      </EuiAccordion>
      <EuiSpacer />
      <p
        css={css`
          font-weight: ${theme.euiTheme.font.weight.bold};
        `}
      >
        {i18n.translate('xpack.observability_onboarding.otelKubernetesPanel.step3b.title', {
          defaultMessage:
            '3(b) - Restart deployment and ensure the annotations are applied and the auto-instrumentation library is injected:',
        })}
      </p>
      <EuiSpacer />
      <EuiCodeBlock
        paddingSize="m"
        language="bash"
        isCopyable={true}
        data-test-subj="observabilityOnboardingOtelKubernetesPanelRestartDeploymentSnippet"
      >
        {`kubectl rollout restart deployment myapp -n my-namespace

kubectl describe pod <myapp-pod-name> -n my-namespace`}
      </EuiCodeBlock>
      <EuiSpacer />
      <p>
        <FormattedMessage
          id="xpack.observability_onboarding.otelKubernetesPanel.forOtherLanguagesThatLabel"
          defaultMessage="For other languages where auto-instrumentation is not available, {link}"
          values={{
            link: (
              <EuiLink
                href="https://ela.st/8-16-otel-apm-instrumentation"
                data-test-subj="observabilityOnboardingOtelKubernetesPanelReferToTheDocumentationLink"
                target="_blank"
              >
                {i18n.translate(
                  'xpack.observability_onboarding.otelKubernetesPanel.referToTheDocumentationLinkLabel',
                  { defaultMessage: 'refer to the documentation' }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </>
  );
};
