/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { buildInstallCommand } from './build_install_command';
import { AGENT_CDN_BASE_URL } from './constants';

describe('buildInstallCommand()', () => {
  describe('Linux', () => {
    it('builds non-OTLP, logs+metrics command when metrics onboarding enabled and OTLP service is not available', () => {
      const isMetricsOnboardingEnabled = true;
      const isManagedOtlpServiceAvailable = false;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if ([[ $(arch) == "arm" || $(arch) == "aarch64" ]]); then echo "arm64"; else echo $(arch); fi)

curl --output elastic-distro-${agentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p elastic-distro-${agentVersion}-linux-$arch && tar -xvf elastic-distro-${agentVersion}-linux-$arch.tar.gz -C "elastic-distro-${agentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-linux-$arch

rm ./otel.yml && cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml && mkdir -p ./data/otelcol && sed -i 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i 's#\\\${env:ELASTIC_ENDPOINT}#${elasticsearchUrl}#g' ./otel.yml && sed -i 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });

    it('builds non-OTLP, logs-only command for when metrics onboarding disabled and OTLP service is not available', () => {
      const isMetricsOnboardingEnabled = false;
      const isManagedOtlpServiceAvailable = false;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if ([[ $(arch) == "arm" || $(arch) == "aarch64" ]]); then echo "arm64"; else echo $(arch); fi)

curl --output elastic-distro-${agentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p elastic-distro-${agentVersion}-linux-$arch && tar -xvf elastic-distro-${agentVersion}-linux-$arch.tar.gz -C "elastic-distro-${agentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-linux-$arch

rm ./otel.yml && cp ./otel_samples/platformlogs.yml ./otel.yml && mkdir -p ./data/otelcol && sed -i 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i 's#\\\${env:ELASTIC_ENDPOINT}#${elasticsearchUrl}#g' ./otel.yml && sed -i 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });

    it('builds OTLP, logs+metrics command when metrics onboarding enabled and OTLP service is available', () => {
      const isMetricsOnboardingEnabled = true;
      const isManagedOtlpServiceAvailable = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if ([[ $(arch) == "arm" || $(arch) == "aarch64" ]]); then echo "arm64"; else echo $(arch); fi)

curl --output elastic-distro-${agentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p elastic-distro-${agentVersion}-linux-$arch && tar -xvf elastic-distro-${agentVersion}-linux-$arch.tar.gz -C "elastic-distro-${agentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-linux-$arch

rm ./otel.yml && cp ./otel_samples/managed_otlp/platformlogs_hostmetrics.yml ./otel.yml && mkdir -p ./data/otelcol && sed -i 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i 's#\\\${env:ELASTIC_OTLP_ENDPOINT}#${managedOtlpServiceUrl}#g' ./otel.yml && sed -i 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });

    it('builds OTLP, logs-only command for when metrics onboarding disabled and OTLP service is available', () => {
      const isMetricsOnboardingEnabled = false;
      const isManagedOtlpServiceAvailable = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if ([[ $(arch) == "arm" || $(arch) == "aarch64" ]]); then echo "arm64"; else echo $(arch); fi)

curl --output elastic-distro-${agentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p elastic-distro-${agentVersion}-linux-$arch && tar -xvf elastic-distro-${agentVersion}-linux-$arch.tar.gz -C "elastic-distro-${agentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-linux-$arch

rm ./otel.yml && cp ./otel_samples/managed_otlp/platformlogs.yml ./otel.yml && mkdir -p ./data/otelcol && sed -i 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i 's#\\\${env:ELASTIC_OTLP_ENDPOINT}#${managedOtlpServiceUrl}#g' ./otel.yml && sed -i 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });
  });
});
