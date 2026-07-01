/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValuesFileUrl } from './build_values_file_url';
import { OTEL_KUBE_STACK_VERSION, OTEL_STACK_NAMESPACE } from './constants';

const DAEMON_PROCESSOR_START_INDEX = 9;

export function buildInstallStackCommand({
  isMetricsOnboardingEnabled,
  isManagedOtlpServiceAvailable,
  managedOtlpEndpointUrl,
  elasticsearchUrl,
  apiKeyEncoded,
  agentVersion,
  useWiredStreams = false,
  onboardingId,
}: {
  isMetricsOnboardingEnabled: boolean;
  isManagedOtlpServiceAvailable: boolean;
  managedOtlpEndpointUrl: string;
  elasticsearchUrl: string;
  apiKeyEncoded: string;
  agentVersion: string;
  useWiredStreams?: boolean;
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

  // Helm --set replaces list items by index. The current EDOT values file has
  // nine base daemon processors, so Kibana's custom processors start at 9.
  let nextLogProcessorIndex = DAEMON_PROCESSOR_START_INDEX;

  const onboardingIdConfig = (() => {
    let config = ` \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].key=onboarding.id' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].value=${onboardingId}' \\
  --set 'collectors.daemon.config.service.pipelines.logs\\/node.processors[${nextLogProcessorIndex++}]=resource/onboarding_id'`;
    if (isMetricsOnboardingEnabled) {
      config += ` \\
  --set 'collectors.daemon.config.service.pipelines.metrics\\/node\\/otel.processors[${DAEMON_PROCESSOR_START_INDEX}]=resource/onboarding_id'`;
    }
    return config;
  })();

  const wiredStreamsConfig = (() => {
    if (!useWiredStreams) return '';

    return ` \\
  --set 'collectors.daemon.config.processors.resource\\/wired_streams.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource\\/wired_streams.attributes[0].key=elasticsearch.index' \\
  --set 'collectors.daemon.config.processors.resource\\/wired_streams.attributes[0].value=logs.otel' \\
  --set 'collectors.daemon.config.service.pipelines.logs\\/node.processors[${nextLogProcessorIndex++}]=resource/wired_streams'`;
  })();

  return `kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=${elasticEndpointVarName}='${ingestEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'${onboardingIdConfig}${wiredStreamsConfig}`;
}
