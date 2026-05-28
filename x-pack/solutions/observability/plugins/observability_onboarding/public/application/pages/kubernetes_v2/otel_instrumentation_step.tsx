/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup, EuiCodeBlock, EuiLink, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { OTEL_STACK_NAMESPACE } from '../../quickstart_flows/otel_kubernetes/constants';
import type { KubernetesV2CardOption } from './kubernetes_v2_card_selector';
import { KubernetesV2CardSelector } from './kubernetes_v2_card_selector';

type OtelAnnotationMode = 'pods' | 'namespace';
type OtelLanguageId = 'nodejs' | 'java' | 'python' | 'dotnet' | 'go';

const OTEL_LANGUAGE_OPTIONS: Array<{ id: OtelLanguageId; label: string }> = [
  {
    id: 'nodejs',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.nodejsLanguageLabel',
      { defaultMessage: 'Node.js' }
    ),
  },
  {
    id: 'java',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.javaLanguageLabel',
      { defaultMessage: 'Java' }
    ),
  },
  {
    id: 'python',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.pythonLanguageLabel',
      { defaultMessage: 'Python' }
    ),
  },
  {
    id: 'dotnet',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.dotnetLanguageLabel',
      { defaultMessage: '.NET' }
    ),
  },
  {
    id: 'go',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.goLanguageLabel',
      { defaultMessage: 'Go' }
    ),
  },
];

const ANNOTATION_MODE_OPTIONS: Array<KubernetesV2CardOption<OtelAnnotationMode>> = [
  {
    id: 'pods',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.specificPodsCardLabel',
      { defaultMessage: 'Annotate specific pods' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.specificPodsCardDescription',
      { defaultMessage: 'Add annotations to selected deployment pod templates.' }
    ),
  },
  {
    id: 'namespace',
    label: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.namespaceCardLabel',
      { defaultMessage: 'Annotate entire namespace' }
    ),
    description: i18n.translate(
      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.namespaceCardDescription',
      { defaultMessage: 'Apply instrumentation annotations to all resources in a namespace.' }
    ),
  },
];

export const OtelInstrumentationStep: React.FC = () => {
  const [isInstrumentationEnabled, setIsInstrumentationEnabled] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<OtelAnnotationMode>('pods');
  const [languageId, setLanguageId] = useState<OtelLanguageId>('nodejs');

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.switchLabel',
          { defaultMessage: 'Instrument my application' }
        )}
        checked={isInstrumentationEnabled}
        onChange={(event) => setIsInstrumentationEnabled(event.target.checked)}
        data-test-subj="observabilityOnboardingKubernetesV2OtelInstrumentationSwitch"
      />

      {isInstrumentationEnabled ? (
        <>
          <EuiSpacer />
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.introduction',
                {
                  defaultMessage:
                    'The Operator automates the injection of auto-instrumentation libraries into annotated pods for some languages.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.languageSelectorLegend',
              { defaultMessage: 'Select a programming language' }
            )}
            idSelected={languageId}
            onChange={(optionId) => setLanguageId(optionId as OtelLanguageId)}
            options={OTEL_LANGUAGE_OPTIONS}
            data-test-subj="observabilityOnboardingKubernetesV2OtelInstrumentationLanguageSelector"
          />
          <EuiSpacer />
          <KubernetesV2CardSelector
            legend={i18n.translate(
              'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.annotationModeLegend',
              { defaultMessage: 'Select an annotation method' }
            )}
            selectedId={annotationMode}
            options={ANNOTATION_MODE_OPTIONS}
            onChange={setAnnotationMode}
            dataTestSubjPrefix="observabilityOnboardingKubernetesV2OtelAnnotationMode"
          />
          <EuiSpacer />
          {annotationMode === 'pods' ? (
            <>
              <EuiCodeBlock
                paddingSize="m"
                language="yaml"
                isCopyable={true}
                data-test-subj="observabilityOnboardingKubernetesV2OtelInstrumentationPodsSnippet"
              >
                {`apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  ...
  template:
    metadata:
      annotations:
        instrumentation.opentelemetry.io/inject-${languageId}: "${OTEL_STACK_NAMESPACE}/elastic-instrumentation"
      ...
    spec:
      containers:
      - image: myapplication-image
        name: app
      ...`}
              </EuiCodeBlock>
              <EuiSpacer />
              <EuiCodeBlock
                paddingSize="m"
                language="bash"
                isCopyable={true}
                data-test-subj="observabilityOnboardingKubernetesV2OtelInstrumentationRestartCommand"
              >
                {`kubectl rollout restart deployment myapp -n my-namespace

kubectl describe pod <myapp-pod-name> -n my-namespace`}
              </EuiCodeBlock>
            </>
          ) : (
            <EuiCodeBlock
              paddingSize="m"
              language="bash"
              isCopyable={true}
              data-test-subj="observabilityOnboardingKubernetesV2OtelInstrumentationNamespaceSnippet"
            >
              {`kubectl annotate namespace my-namespace instrumentation.opentelemetry.io/inject-${languageId}="${OTEL_STACK_NAMESPACE}/elastic-instrumentation"`}
            </EuiCodeBlock>
          )}
          <EuiSpacer />
          <p>
            <FormattedMessage
              id="xpack.observability_onboarding.kubernetesV2.otelInstrumentation.otherLanguagesDocs"
              defaultMessage="For other languages where auto-instrumentation is not available, {link}"
              values={{
                link: (
                  <EuiLink
                    href="https://ela.st/8-16-otel-apm-instrumentation"
                    data-test-subj="observabilityOnboardingKubernetesV2OtelInstrumentationDocsLink"
                    target="_blank"
                    external
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.kubernetesV2.otelInstrumentation.docsLinkLabel',
                      { defaultMessage: 'refer to the documentation' }
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
