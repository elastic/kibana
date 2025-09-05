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
    it('builds non-OTLP, logs+metrics command for self-hosted deployments', () => {
      const isServerless = false;
      const isCloud = false;
      const metricsOnboardingEnabled = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
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

    it('builds OTLP, logs+metrics command for serverless deployments', () => {
      const isServerless = true;
      const isCloud = true;
      const metricsOnboardingEnabled = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
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

    it('builds OTLP, logs+metrics command for stateful cloud deployments', () => {
      const isServerless = false;
      const isCloud = true;
      const metricsOnboardingEnabled = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
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

    it('builds OTLP, logs-only command for serverless logs-essentials deployments', () => {
      const isServerless = true;
      const isCloud = true;
      const metricsOnboardingEnabled = false;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'linux',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
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

  describe('macOS', () => {
    it('builds non-OTLP, logs+metrics command for self-hosted deployments', () => {
      const isServerless = false;
      const isCloud = false;
      const metricsOnboardingEnabled = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'mac',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if [[ $(uname -m) == "arm64" ]]; then echo "aarch64"; else echo $(uname -m); fi)

curl --output elastic-distro-${agentVersion}-darwin-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-darwin-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p "elastic-distro-${agentVersion}-darwin-$arch" && tar -xvf elastic-distro-${agentVersion}-darwin-$arch.tar.gz -C "elastic-distro-${agentVersion}-darwin-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-darwin-$arch

rm ./otel.yml && cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml && mkdir -p ./data/otelcol  && sed -i '' 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i '' 's#\\\${env:ELASTIC_ENDPOINT}#${elasticsearchUrl}#g' ./otel.yml && sed -i '' 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });

    it('builds OTLP, logs+metrics command for serverless deployments', () => {
      const isServerless = true;
      const isCloud = true;
      const metricsOnboardingEnabled = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'mac',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if [[ $(uname -m) == "arm64" ]]; then echo "aarch64"; else echo $(uname -m); fi)

curl --output elastic-distro-${agentVersion}-darwin-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-darwin-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p "elastic-distro-${agentVersion}-darwin-$arch" && tar -xvf elastic-distro-${agentVersion}-darwin-$arch.tar.gz -C "elastic-distro-${agentVersion}-darwin-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-darwin-$arch

rm ./otel.yml && cp ./otel_samples/managed_otlp/platformlogs_hostmetrics.yml ./otel.yml && mkdir -p ./data/otelcol  && sed -i '' 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i '' 's#\\\${env:ELASTIC_OTLP_ENDPOINT}#${managedOtlpServiceUrl}#g' ./otel.yml && sed -i '' 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });

    it('builds OTLP, logs+metrics command for stateful cloud deployments', () => {
      const isServerless = false;
      const isCloud = true;
      const metricsOnboardingEnabled = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'mac',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if [[ $(uname -m) == "arm64" ]]; then echo "aarch64"; else echo $(uname -m); fi)

curl --output elastic-distro-${agentVersion}-darwin-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-darwin-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p "elastic-distro-${agentVersion}-darwin-$arch" && tar -xvf elastic-distro-${agentVersion}-darwin-$arch.tar.gz -C "elastic-distro-${agentVersion}-darwin-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-darwin-$arch

rm ./otel.yml && cp ./otel_samples/managed_otlp/platformlogs_hostmetrics.yml ./otel.yml && mkdir -p ./data/otelcol  && sed -i '' 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i '' 's#\\\${env:ELASTIC_OTLP_ENDPOINT}#${managedOtlpServiceUrl}#g' ./otel.yml && sed -i '' 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });

    it('builds OTLP, logs-only command for serverless logs-essentials deployments', () => {
      const isServerless = true;
      const isCloud = true;
      const metricsOnboardingEnabled = false;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'mac',
        isServerless,
        isCloud,
        metricsOnboardingEnabled,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command)
        .toEqual(`arch=$(if [[ $(uname -m) == "arm64" ]]; then echo "aarch64"; else echo $(uname -m); fi)

curl --output elastic-distro-${agentVersion}-darwin-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-darwin-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p "elastic-distro-${agentVersion}-darwin-$arch" && tar -xvf elastic-distro-${agentVersion}-darwin-$arch.tar.gz -C "elastic-distro-${agentVersion}-darwin-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-darwin-$arch

rm ./otel.yml && cp ./otel_samples/managed_otlp/platformlogs.yml ./otel.yml && mkdir -p ./data/otelcol  && sed -i '' 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i '' 's#\\\${env:ELASTIC_OTLP_ENDPOINT}#${managedOtlpServiceUrl}#g' ./otel.yml && sed -i '' 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });
  });
});
