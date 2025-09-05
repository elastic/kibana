/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValuesFileUrl } from './build_values_file_url';
import { OTEL_KUBE_STACK_VERSION, OTEL_STACK_NAMESPACE } from './constants';

export function buildInstallStackCommand({
  isServerless,
  isCloud,
  metricsOnboardingEnabled,
  managedOtlpEndpointUrl,
  elasticsearchUrl,
  apiKeyEncoded,
  agentVersion,
}: {
  isServerless: boolean;
  isCloud: boolean;
  metricsOnboardingEnabled: boolean;
  managedOtlpEndpointUrl: string;
  elasticsearchUrl: string;
  apiKeyEncoded: string;
  agentVersion: string;
}): string {
  const isUsingManagedOtlpEndpoint = isServerless || isCloud;
  const ingestEndpointUrl = isUsingManagedOtlpEndpoint ? managedOtlpEndpointUrl : elasticsearchUrl;
  const elasticEndpointVarName = isUsingManagedOtlpEndpoint
    ? 'elastic_otlp_endpoint'
    : 'elastic_endpoint';
  const otelKubeStackValuesFileUrl = buildValuesFileUrl({
    isServerless,
    isCloud,
    metricsOnboardingEnabled,
    agentVersion,
  });

  return `kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=${elasticEndpointVarName}='${ingestEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'`;
}
