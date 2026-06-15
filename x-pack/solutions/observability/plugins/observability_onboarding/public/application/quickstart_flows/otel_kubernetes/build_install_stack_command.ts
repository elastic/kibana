/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValuesFileUrl } from './build_values_file_url';
import { OTEL_KUBE_STACK_VERSION, OTEL_STACK_NAMESPACE } from './constants';

export function buildInstallStackCommand({
  isMetricsOnboardingEnabled,
  isManagedOtlpServiceAvailable,
  managedOtlpEndpointUrl,
  elasticsearchUrl,
  apiKeyEncoded,
  agentVersion,
  onboardingId,
}: {
  isMetricsOnboardingEnabled: boolean;
  isManagedOtlpServiceAvailable: boolean;
  managedOtlpEndpointUrl: string;
  elasticsearchUrl: string;
  apiKeyEncoded: string;
  agentVersion: string;
  onboardingId: string;
}): string {
  const ingestEndpointUrl = isManagedOtlpServiceAvailable
    ? managedOtlpEndpointUrl
    : elasticsearchUrl;
  const elasticEndpointVarName = isManagedOtlpServiceAvailable
    ? 'elastic_otlp_endpoint'
    : 'elastic_endpoint';
  const otelKubeStackValuesFileUrl = buildValuesFileUrl({
    isMetricsOnboardingEnabled,
    isManagedOtlpServiceAvailable,
    agentVersion,
  });

  // The base kube-stack Helm values file defines processors[0..7] for the
  // logs/node and metrics/node/otel pipelines. Custom processors are appended
  // starting at index 8.
  const logProcessorIndex = 8;
  const metricProcessorIndex = 8;

  const onboardingIdConfig = (() => {
    let config = ` \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].key=onboarding.id' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].value=${onboardingId}' \\
  --set 'collectors.daemon.config.service.pipelines.logs\\/node.processors[${logProcessorIndex}]=resource/onboarding_id'`;
    if (isMetricsOnboardingEnabled) {
      config += ` \\
  --set 'collectors.daemon.config.service.pipelines.metrics\\/node\\/otel.processors[${metricProcessorIndex}]=resource/onboarding_id'`;
    }
    return config;
  })();

  return `kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=${elasticEndpointVarName}='${ingestEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'${onboardingIdConfig}`;
}
