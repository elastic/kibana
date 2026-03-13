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
  useWiredStreams = false,
}: {
  isMetricsOnboardingEnabled: boolean;
  isManagedOtlpServiceAvailable: boolean;
  managedOtlpEndpointUrl: string;
  elasticsearchUrl: string;
  apiKeyEncoded: string;
  agentVersion: string;
  useWiredStreams?: boolean;
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

  const wiredStreamsConfig = (() => {
    if (!useWiredStreams) return '';

    // Route container logs to wired streams by injecting the
    // resource/wired_streams processor on the daemon collector's node pipeline.
    // APM logs are intentionally excluded — wired streams support for APM is
    // tracked separately and not yet ready.
    // K8s event logs (from the cluster collector) are unaffected and keep
    // their classic routing (e.g. logs-k8sobjectsreceiver.otel-default).
    // The elasticsearch.index resource attribute works for both direct ES
    // (elasticsearch exporter) and managed OTLP (otlp/ingest exporter).
    return ` \\
  --set 'collectors.daemon.config.processors.resource\\/wired_streams.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource\\/wired_streams.attributes[0].key=elasticsearch.index' \\
  --set 'collectors.daemon.config.processors.resource\\/wired_streams.attributes[0].value=logs.otel' \\
  --set 'collectors.daemon.config.service.pipelines.logs\\/node.processors[8]=resource/wired_streams'`;
  })();

  return `kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=${elasticEndpointVarName}='${ingestEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}'${wiredStreamsConfig}`;
}
