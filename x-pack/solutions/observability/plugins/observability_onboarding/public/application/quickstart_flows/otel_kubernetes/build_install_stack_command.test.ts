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

const TEST_ONBOARDING_ID = 'test-onboarding-id';

const defaultArgs = {
  isMetricsOnboardingEnabled: true,
  isManagedOtlpServiceAvailable: false,
  managedOtlpEndpointUrl: 'https://example.com/otlp',
  elasticsearchUrl: 'https://example.com/elasticsearch',
  apiKeyEncoded: 'encoded_api_key',
  agentVersion: '9.1.0',
  onboardingId: TEST_ONBOARDING_ID,
} as const;

describe('buildInstallStackCommand()', () => {
  it('builds command with Elasticsearch endpoint when OTLP service is not available', () => {
    const { elasticsearchUrl, apiKeyEncoded, agentVersion } = defaultArgs;
    const otelKubeStackValuesFileUrl = buildValuesFileUrl({
      isMetricsOnboardingEnabled: true,
      isManagedOtlpServiceAvailable: false,
      agentVersion,
    });
    const command = buildInstallStackCommand(defaultArgs);

    expect(command).toEqual(`kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=elastic_endpoint='${elasticsearchUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].key=onboarding.id' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].value=${TEST_ONBOARDING_ID}' \\
  --set 'collectors.daemon.config.service.pipelines.logs\\/node.processors[8]=resource/onboarding_id' \\
  --set 'collectors.daemon.config.service.pipelines.metrics\\/node\\/otel.processors[8]=resource/onboarding_id'`);
  });

  it('builds command with OTLP endpoint when OTLP service is available', () => {
    const { managedOtlpEndpointUrl, apiKeyEncoded, agentVersion } = defaultArgs;
    const otelKubeStackValuesFileUrl = buildValuesFileUrl({
      isMetricsOnboardingEnabled: true,
      isManagedOtlpServiceAvailable: true,
      agentVersion,
    });
    const command = buildInstallStackCommand({
      ...defaultArgs,
      isManagedOtlpServiceAvailable: true,
    });

    expect(command).toEqual(`kubectl create namespace ${OTEL_STACK_NAMESPACE}
kubectl create secret generic elastic-secret-otel \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --from-literal=elastic_otlp_endpoint='${managedOtlpEndpointUrl}' \\
  --from-literal=elastic_api_key='${apiKeyEncoded}'
helm upgrade --install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace ${OTEL_STACK_NAMESPACE} \\
  --values '${otelKubeStackValuesFileUrl}' \\
  --version '${OTEL_KUBE_STACK_VERSION}' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].action=upsert' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].key=onboarding.id' \\
  --set 'collectors.daemon.config.processors.resource\\/onboarding_id.attributes[0].value=${TEST_ONBOARDING_ID}' \\
  --set 'collectors.daemon.config.service.pipelines.logs\\/node.processors[8]=resource/onboarding_id' \\
  --set 'collectors.daemon.config.service.pipelines.metrics\\/node\\/otel.processors[8]=resource/onboarding_id'`);
  });

  describe('onboarding_id processor', () => {
    it('always injects resource/onboarding_id processor into logs pipeline', () => {
      const command = buildInstallStackCommand({
        ...defaultArgs,
        isMetricsOnboardingEnabled: false,
      });

      expect(command).toContain('resource\\/onboarding_id');
      expect(command).toContain(`onboarding_id.attributes[0].value=${TEST_ONBOARDING_ID}`);
      expect(command).toContain(
        'collectors.daemon.config.service.pipelines.logs\\/node.processors[8]=resource/onboarding_id'
      );
    });

    it('injects resource/onboarding_id into metrics pipeline when metrics enabled', () => {
      const command = buildInstallStackCommand(defaultArgs);

      expect(command).toContain(
        'collectors.daemon.config.service.pipelines.metrics\\/node\\/otel.processors[8]=resource/onboarding_id'
      );
    });

    it('does not inject resource/onboarding_id into metrics pipeline when metrics disabled', () => {
      const command = buildInstallStackCommand({
        ...defaultArgs,
        isMetricsOnboardingEnabled: false,
      });

      expect(command).not.toContain('metrics\\/node\\/otel');
    });
  });

  describe('wired streams', () => {
    it('does not include wired streams config when useWiredStreams is false', () => {
      const command = buildInstallStackCommand({
        ...defaultArgs,
        useWiredStreams: false,
      });

      expect(command).not.toContain('resource\\/wired_streams');
      expect(command).not.toContain('elasticsearch.index');
    });

    it('routes daemon logs to wired streams when useWiredStreams is true', () => {
      const command = buildInstallStackCommand({
        ...defaultArgs,
        useWiredStreams: true,
      });

      expect(command).toContain('collectors.daemon.config.processors.resource\\/wired_streams');
      expect(command).toContain('elasticsearch.index');
      expect(command).toContain(
        'collectors.daemon.config.service.pipelines.logs\\/node.processors[9]=resource/wired_streams'
      );
    });

    it('assigns onboarding_id before wired_streams in the logs pipeline', () => {
      const command = buildInstallStackCommand({
        ...defaultArgs,
        useWiredStreams: true,
      });

      expect(command).toContain('logs\\/node.processors[8]=resource/onboarding_id');
      expect(command).toContain('logs\\/node.processors[9]=resource/wired_streams');
    });
  });
});
