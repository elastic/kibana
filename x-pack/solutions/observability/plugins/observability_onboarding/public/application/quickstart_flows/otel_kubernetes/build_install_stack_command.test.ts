/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { OTEL_KUBE_STACK_VERSION, OTEL_STACK_NAMESPACE } from './constants';
import { buildInstallStackCommand } from './build_install_stack_command';
import { buildValuesFileUrl } from './build_values_file_url';

describe('buildValuesFileUrl()', () => {
  it('builds command with Elasticsearch endpoint for self-hosted deployments', () => {
    const isServerless = false;
    const isCloud = false;
    const metricsOnboardingEnabled = true;
    const managedOtlpEndpointUrl = 'https://example.com/otlp';
    const elasticsearchUrl = 'https://example.com/elasticsearch';
    const apiKeyEncoded = 'encoded_api_key';
    const agentVersion = '9.1.0';
    const otelKubeStackValuesFileUrl = buildValuesFileUrl({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      agentVersion,
    });
    const command = buildInstallStackCommand({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      managedOtlpEndpointUrl,
      elasticsearchUrl,
      apiKeyEncoded,
      agentVersion,
    });

    expect(command).toEqual(`kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=elastic_endpoint='${elasticsearchUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'`);
  });

  it('builds command with OTLP endpoint for serverless deployments', () => {
    const isServerless = true;
    const isCloud = true;
    const metricsOnboardingEnabled = true;
    const managedOtlpEndpointUrl = 'https://example.com/otlp';
    const elasticsearchUrl = 'https://example.com/elasticsearch';
    const apiKeyEncoded = 'encoded_api_key';
    const agentVersion = '9.1.0';
    const otelKubeStackValuesFileUrl = buildValuesFileUrl({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      agentVersion,
    });
    const command = buildInstallStackCommand({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      managedOtlpEndpointUrl,
      elasticsearchUrl,
      apiKeyEncoded,
      agentVersion,
    });

    expect(command).toEqual(`kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=elastic_otlp_endpoint='${managedOtlpEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'`);
  });

  it('builds command with OTLP endpoint for stateful cloud deployments', () => {
    const isServerless = false;
    const isCloud = true;
    const metricsOnboardingEnabled = true;
    const managedOtlpEndpointUrl = 'https://example.com/otlp';
    const elasticsearchUrl = 'https://example.com/elasticsearch';
    const apiKeyEncoded = 'encoded_api_key';
    const agentVersion = '9.1.0';
    const otelKubeStackValuesFileUrl = buildValuesFileUrl({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      agentVersion,
    });
    const command = buildInstallStackCommand({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      managedOtlpEndpointUrl,
      elasticsearchUrl,
      apiKeyEncoded,
      agentVersion,
    });

    expect(command).toEqual(`kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=elastic_otlp_endpoint='${managedOtlpEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'`);
  });

  it('builds command with OTLP endpoint for serverless logs-essentials deployments', () => {
    const isServerless = true;
    const isCloud = true;
    const metricsOnboardingEnabled = false;
    const managedOtlpEndpointUrl = 'https://example.com/otlp';
    const elasticsearchUrl = 'https://example.com/elasticsearch';
    const apiKeyEncoded = 'encoded_api_key';
    const agentVersion = '9.1.0';
    const otelKubeStackValuesFileUrl = buildValuesFileUrl({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      agentVersion,
    });
    const command = buildInstallStackCommand({
      isServerless,
      isCloud,
      metricsOnboardingEnabled,
      managedOtlpEndpointUrl,
      elasticsearchUrl,
      apiKeyEncoded,
      agentVersion,
    });

    expect(command).toEqual(`kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=elastic_otlp_endpoint='${managedOtlpEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'`);
  });
});
