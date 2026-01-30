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
        .toEqual(`arch=$(if [[ $(uname -m) == "arm" || $(uname -m) == "aarch64" ]]; then echo "arm64"; else echo $(uname -m); fi)

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
        .toEqual(`arch=$(if [[ $(uname -m) == "arm" || $(uname -m) == "aarch64" ]]; then echo "arm64"; else echo $(uname -m); fi)

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
        .toEqual(`arch=$(if [[ $(uname -m) == "arm" || $(uname -m) == "aarch64" ]]; then echo "arm64"; else echo $(uname -m); fi)

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
        .toEqual(`arch=$(if [[ $(uname -m) == "arm" || $(uname -m) == "aarch64" ]]; then echo "arm64"; else echo $(uname -m); fi)

curl --output elastic-distro-${agentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p elastic-distro-${agentVersion}-linux-$arch && tar -xvf elastic-distro-${agentVersion}-linux-$arch.tar.gz -C "elastic-distro-${agentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-linux-$arch

rm ./otel.yml && cp ./otel_samples/managed_otlp/platformlogs.yml ./otel.yml && mkdir -p ./data/otelcol && sed -i 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i 's#\\\${env:ELASTIC_OTLP_ENDPOINT}#${managedOtlpServiceUrl}#g' ./otel.yml && sed -i 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml`);
    });
  });

  describe('Windows', () => {
    it('builds non-OTLP, logs+metrics command when metrics onboarding enabled and OTLP service is not available', () => {
      const isMetricsOnboardingEnabled = true;
      const isManagedOtlpServiceAvailable = false;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'windows',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command).toContain("$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64')");
      expect(command).toContain(`https://${AGENT_CDN_BASE_URL}/$agentName.zip`);
      expect(command).toContain('Invoke-WebRequest');
      expect(command).toContain('Expand-Archive');
      expect(command).toContain('.\\otel_samples\\platformlogs_hostmetrics.yml');
      expect(command).toContain(elasticsearchUrl);
      expect(command).toContain(apiKeyEncoded);
      expect(command).toContain('ELASTIC_ENDPOINT');
      expect(command).not.toContain('ELASTIC_OTLP_ENDPOINT');
    });

    it('builds non-OTLP, logs-only command when metrics onboarding disabled and OTLP service is not available', () => {
      const isMetricsOnboardingEnabled = false;
      const isManagedOtlpServiceAvailable = false;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'windows',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command).toContain('.\\otel_samples\\platformlogs.yml');
      expect(command).not.toContain('platformlogs_hostmetrics.yml');
      expect(command).toContain(elasticsearchUrl);
    });

    it('builds OTLP, logs+metrics command when metrics onboarding enabled and OTLP service is available', () => {
      const isMetricsOnboardingEnabled = true;
      const isManagedOtlpServiceAvailable = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'windows',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command).toContain('.\\otel_samples\\managed_otlp\\platformlogs_hostmetrics.yml');
      expect(command).toContain(managedOtlpServiceUrl);
      expect(command).toContain('ELASTIC_OTLP_ENDPOINT');
      expect(command).not.toContain('ELASTIC_ENDPOINT');
    });

    it('builds OTLP, logs-only command when metrics onboarding disabled and OTLP service is available', () => {
      const isMetricsOnboardingEnabled = false;
      const isManagedOtlpServiceAvailable = true;
      const managedOtlpServiceUrl = 'http://example.com/otlp';
      const elasticsearchUrl = 'http://example.com/elasticsearch';
      const apiKeyEncoded = 'api_key_encoded';
      const agentVersion = '9.1.0';
      const command = buildInstallCommand({
        platform: 'windows',
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl,
        elasticsearchUrl,
        apiKeyEncoded,
        agentVersion,
      });

      expect(command).toContain('.\\otel_samples\\managed_otlp\\platformlogs.yml');
      expect(command).not.toContain('platformlogs_hostmetrics.yml');
      expect(command).toContain(managedOtlpServiceUrl);
      expect(command).toContain('ELASTIC_OTLP_ENDPOINT');
    });

    it('uses PowerShell commands for file operations', () => {
      const command = buildInstallCommand({
        platform: 'windows',
        isMetricsOnboardingEnabled: true,
        isManagedOtlpServiceAvailable: false,
        managedOtlpServiceUrl: 'http://example.com/otlp',
        elasticsearchUrl: 'http://example.com/elasticsearch',
        apiKeyEncoded: 'api_key',
        agentVersion: '9.1.0',
      });

      expect(command).toContain('Invoke-WebRequest');
      expect(command).toContain('Expand-Archive');
      expect(command).toContain('Rename-Item');
      expect(command).toContain('Remove-Item');
      expect(command).toContain('Set-Location');
      expect(command).toContain('Copy-Item');
      expect(command).toContain('New-Item');
      expect(command).toContain('Get-Content');
      expect(command).toContain('Set-Content');
      expect(command).toContain('-replace');
    });
  });
});
