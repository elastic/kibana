/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValuesFileUrl } from './build_values_file_url';
import { OTEL_KUBE_STACK_VERSION, OTEL_STACK_NAMESPACE } from './constants';

const EXTENDED_DAEMON_PROCESSORS_AGENT_VERSION = '9.4.2';
const EXTENDED_DAEMON_PROCESSORS_AGENT_VERSION_PARSED: [number, number, number] = [9, 4, 2];
const LEGACY_DAEMON_PROCESSOR_START_INDEX = 8;
const EXTENDED_DAEMON_PROCESSOR_START_INDEX = 9;

interface GetDaemonProcessorStartIndexesParams {
  agentVersion: string;
  isManagedOtlpServiceAvailable: boolean;
  isMetricsOnboardingEnabled: boolean;
}

interface DaemonProcessorStartIndexes {
  logsNode: number;
  metricsNodeOtel?: number;
}

const tryParseAgentVersion = (agentVersion: string): [number, number, number] | undefined => {
  const normalizedVersion = agentVersion.trim().replace(/^v/i, '');
  const versionMatch = normalizedVersion.match(/^(\d+)\.(\d+)(?:\.(\d+))?(?:[-+].*)?$/);

  if (!versionMatch) {
    return undefined;
  }

  const [, major, minor, patch = '0'] = versionMatch;

  return [Number.parseInt(major, 10), Number.parseInt(minor, 10), Number.parseInt(patch, 10)];
};

const parseAgentVersion = (agentVersion: string): [number, number, number] => {
  const parsedVersion = tryParseAgentVersion(agentVersion);

  if (parsedVersion) {
    return parsedVersion;
  }

  // Malformed version data should not append custom processors before upstream
  // processors such as resource/cloud, so fail closed to the extended baseline.
  return EXTENDED_DAEMON_PROCESSORS_AGENT_VERSION_PARSED;
};

const isAgentVersionAtLeast = (agentVersion: string, minimumVersion: string): boolean => {
  const [major, minor, patch] = parseAgentVersion(agentVersion);
  const [minimumMajor, minimumMinor, minimumPatch] = parseAgentVersion(minimumVersion);

  if (major !== minimumMajor) return major > minimumMajor;
  if (minor !== minimumMinor) return minor > minimumMinor;
  return patch >= minimumPatch;
};

const getDaemonProcessorStartIndex = ({
  agentVersion,
}: GetDaemonProcessorStartIndexesParams): number => {
  // Helm --set can replace list items by index, but it cannot append to an
  // existing list. EDOT 9.4.2 added a daemon processor, so custom processors
  // must start one slot later to avoid replacing resource/cloud.
  if (isAgentVersionAtLeast(agentVersion, EXTENDED_DAEMON_PROCESSORS_AGENT_VERSION)) {
    return EXTENDED_DAEMON_PROCESSOR_START_INDEX;
  }

  return LEGACY_DAEMON_PROCESSOR_START_INDEX;
};

export const getDaemonProcessorStartIndexes = (
  params: GetDaemonProcessorStartIndexesParams
): DaemonProcessorStartIndexes => {
  const { isMetricsOnboardingEnabled } = params;
  const daemonProcessorStartIndex = getDaemonProcessorStartIndex(params);

  return {
    logsNode: daemonProcessorStartIndex,
    metricsNodeOtel: isMetricsOnboardingEnabled ? daemonProcessorStartIndex : undefined,
  };
};

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
  const valuesFileVariant = {
    isMetricsOnboardingEnabled,
    isManagedOtlpServiceAvailable,
    agentVersion,
  };
  const otelKubeStackValuesFileUrl = buildValuesFileUrl(valuesFileVariant);

  // Processor indexes must match the selected EDOT values-file variant because
  // Helm --set cannot append to existing processor lists.
  const daemonProcessorStartIndexes = getDaemonProcessorStartIndexes(valuesFileVariant);

  let nextLogProcessorIndex = daemonProcessorStartIndexes.logsNode;

  const onboardingIdConfig = (() => {
    let config = ` \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].key=onboarding.id' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].value=${onboardingId}' \\
  --set 'collectors.daemon.config.service.pipelines.logs\\/node.processors[${nextLogProcessorIndex++}]=resource/onboarding_id'`;
    if (isMetricsOnboardingEnabled) {
      const nextMetricProcessorIndex = daemonProcessorStartIndexes.metricsNodeOtel;
      if (nextMetricProcessorIndex === undefined) {
        throw new Error(
          'Expected a metrics/node/otel processor start index when metrics onboarding is enabled.'
        );
      }
      config += ` \\
  --set 'collectors.daemon.config.service.pipelines.metrics\\/node\\/otel.processors[${nextMetricProcessorIndex}]=resource/onboarding_id'`;
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
