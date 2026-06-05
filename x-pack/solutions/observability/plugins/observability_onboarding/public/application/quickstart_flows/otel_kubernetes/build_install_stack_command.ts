/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValuesFileUrl } from './build_values_file_url';
import { OTEL_KUBE_STACK_VERSION, OTEL_STACK_NAMESPACE } from './constants';

const CURRENT_BASELINE_AGENT_VERSION = '9.4.2';

// These processor lists intentionally mirror the EDOT values-file daemon pipeline
// baselines and should be updated when those values-file baselines change.
const LEGACY_DAEMON_LOGS_NODE_PROCESSORS = [
  'batch',
  'k8sattributes',
  'resourcedetection/system',
  'resourcedetection/eks',
  'resourcedetection/gcp',
  'resourcedetection/aks',
  'resource/hostname',
  'resource/cloud',
] as const;

const LEGACY_DAEMON_METRICS_NODE_OTEL_PROCESSORS = [
  'batch/metrics',
  'k8sattributes',
  'resourcedetection/system',
  'resourcedetection/eks',
  'resourcedetection/gcp',
  'resourcedetection/aks',
  'resource/hostname',
  'resource/cloud',
] as const;

const LEGACY_9_1_MANAGED_DAEMON_LOGS_NODE_PROCESSORS = [
  'batch',
  'k8sattributes',
  'resourcedetection/system',
  'resourcedetection/eks',
  'resourcedetection/gcp',
  'resourcedetection/aks',
  'resource/k8s',
  'resource/hostname',
  'resource/cloud',
] as const;

const LEGACY_9_1_MANAGED_DAEMON_METRICS_NODE_OTEL_PROCESSORS = [
  'batch/metrics',
  'k8sattributes',
  'resourcedetection/system',
  'resourcedetection/eks',
  'resourcedetection/gcp',
  'resourcedetection/aks',
  'resource/k8s',
  'resource/hostname',
  'resource/cloud',
] as const;

const CURRENT_DAEMON_LOGS_NODE_PROCESSORS = [
  'batch',
  'k8sattributes',
  'resourcedetection/env',
  'resourcedetection/system',
  'resourcedetection/eks',
  'resourcedetection/gcp',
  'resourcedetection/aks',
  'resource/hostname',
  'resource/cloud',
] as const;

const CURRENT_DAEMON_METRICS_NODE_OTEL_PROCESSORS = [
  'batch/metrics',
  'k8sattributes',
  'resourcedetection/env',
  'resourcedetection/system',
  'resourcedetection/eks',
  'resourcedetection/gcp',
  'resourcedetection/aks',
  'resource/hostname',
  'resource/cloud',
] as const;

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
  // Prerelease and build metadata are normalized to the base version because this
  // helper only models released EDOT values-file baseline shapes used by onboarding;
  // the tests guard this normalization.
  const versionMatch = normalizedVersion.match(/^(\d+)\.(\d+)(?:\.(\d+))?(?:[-+].*)?$/);

  if (!versionMatch) {
    return undefined;
  }

  const [, major, minor, patch = '0'] = versionMatch;

  return [Number.parseInt(major, 10), Number.parseInt(minor, 10), Number.parseInt(patch, 10)];
};

const parseStrictAgentVersion = (agentVersion: string): [number, number, number] => {
  const parsedVersion = tryParseAgentVersion(agentVersion);

  if (!parsedVersion) {
    throw new Error(`Expected a parseable agent version: ${agentVersion}`);
  }

  return parsedVersion;
};

const CURRENT_BASELINE_AGENT_VERSION_PARSED = parseStrictAgentVersion(
  CURRENT_BASELINE_AGENT_VERSION
);

const parseAgentVersion = (agentVersion: string): [number, number, number] => {
  const parsedVersion = tryParseAgentVersion(agentVersion);

  if (parsedVersion) {
    return parsedVersion;
  }

  // Malformed version data should not append custom processors before upstream
  // processors such as resource/cloud, so fail closed to the current baseline.
  return CURRENT_BASELINE_AGENT_VERSION_PARSED;
};

const isAgentVersionAtLeast = (agentVersion: string, minimumVersion: string): boolean => {
  const [major, minor, patch] = parseAgentVersion(agentVersion);
  const [minimumMajor, minimumMinor, minimumPatch] = parseAgentVersion(minimumVersion);

  if (major !== minimumMajor) return major > minimumMajor;
  if (minor !== minimumMinor) return minor > minimumMinor;
  return patch >= minimumPatch;
};

const isAgentVersionBefore = (agentVersion: string, maximumVersion: string): boolean => {
  const [major, minor, patch] = parseAgentVersion(agentVersion);
  const [maximumMajor, maximumMinor, maximumPatch] = parseAgentVersion(maximumVersion);

  if (major !== maximumMajor) return major < maximumMajor;
  if (minor !== maximumMinor) return minor < maximumMinor;
  return patch < maximumPatch;
};

const getBaseDaemonProcessorLists = ({
  agentVersion,
  isManagedOtlpServiceAvailable,
  isMetricsOnboardingEnabled,
}: GetDaemonProcessorStartIndexesParams) => {
  // Helm --set can replace list items by index, but it cannot append to an
  // existing list. Keep the EDOT baseline explicit so custom processors start
  // after upstream processors such as resource/cloud.
  if (isAgentVersionAtLeast(agentVersion, CURRENT_BASELINE_AGENT_VERSION)) {
    return {
      logsNode: CURRENT_DAEMON_LOGS_NODE_PROCESSORS,
      metricsNodeOtel: CURRENT_DAEMON_METRICS_NODE_OTEL_PROCESSORS,
    };
  }

  if (
    isAgentVersionAtLeast(agentVersion, '9.1.0') &&
    isAgentVersionBefore(agentVersion, '9.2.0') &&
    isManagedOtlpServiceAvailable &&
    isMetricsOnboardingEnabled
  ) {
    return {
      logsNode: LEGACY_9_1_MANAGED_DAEMON_LOGS_NODE_PROCESSORS,
      metricsNodeOtel: LEGACY_9_1_MANAGED_DAEMON_METRICS_NODE_OTEL_PROCESSORS,
    };
  }

  return {
    logsNode: LEGACY_DAEMON_LOGS_NODE_PROCESSORS,
    metricsNodeOtel: LEGACY_DAEMON_METRICS_NODE_OTEL_PROCESSORS,
  };
};

export const getDaemonProcessorStartIndexes = (
  params: GetDaemonProcessorStartIndexesParams
): DaemonProcessorStartIndexes => {
  const { isMetricsOnboardingEnabled } = params;
  const { logsNode, metricsNodeOtel } = getBaseDaemonProcessorLists(params);

  return {
    logsNode: logsNode.length,
    metricsNodeOtel: isMetricsOnboardingEnabled ? metricsNodeOtel.length : undefined,
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
