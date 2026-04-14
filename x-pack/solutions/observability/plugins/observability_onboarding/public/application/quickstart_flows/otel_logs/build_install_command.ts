/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_CDN_BASE_URL } from './constants';

export function buildInstallCommand({
  platform,
  isMetricsOnboardingEnabled,
  isManagedOtlpServiceAvailable,
  managedOtlpServiceUrl,
  elasticsearchUrl,
  apiKeyEncoded,
  agentVersion,
  useWiredStreams = false,
}: {
  platform: 'mac' | 'linux' | 'windows';
  isMetricsOnboardingEnabled: boolean;
  isManagedOtlpServiceAvailable: boolean;
  managedOtlpServiceUrl: string;
  elasticsearchUrl: string;
  apiKeyEncoded: string;
  agentVersion: string;
  useWiredStreams?: boolean;
}): string {
  const ingestEndpointUrl = isManagedOtlpServiceAvailable
    ? managedOtlpServiceUrl
    : elasticsearchUrl;
  const sampleFileSubfolder = isManagedOtlpServiceAvailable ? 'managed_otlp/' : '';
  const sampleConfigurationPath = isMetricsOnboardingEnabled
    ? `./otel_samples/${sampleFileSubfolder}platformlogs_hostmetrics.yml`
    : `./otel_samples/${sampleFileSubfolder}platformlogs.yml`;
  const elasticEndpointVarName = isManagedOtlpServiceAvailable
    ? 'ELASTIC_OTLP_ENDPOINT'
    : 'ELASTIC_ENDPOINT';

  // Windows uses backslashes for the configuration file path
  const windowsSampleConfigurationPath = isMetricsOnboardingEnabled
    ? `.\\otel_samples\\${sampleFileSubfolder.replace('/', '\\')}platformlogs_hostmetrics.yml`
    : `.\\otel_samples\\${sampleFileSubfolder.replace('/', '\\')}platformlogs.yml`;

  const wiredStreamsSedLinux = (() => {
    if (!useWiredStreams) return '';
    if (isManagedOtlpServiceAvailable) {
      return ` && sed -i 's/^processors:/&\\n  resource\\/wired_streams:\\n    attributes:\\n      - action: upsert\\n        key: elasticsearch.index\\n        value: logs.otel/' ./otel.yml && sed -i '/logs\\/platformlogs:/,/exporters:/{/processors:/s/\\]/, resource\\/wired_streams]/}' ./otel.yml`;
    }

    return ` && sed -i '/^[[:space:]]*elasticsearch\\/otel:/a\\    logs_index: logs.otel' ./otel.yml`;
  })();
  const wiredStreamsSedMac = (() => {
    if (!useWiredStreams) return '';
    if (isManagedOtlpServiceAvailable) {
      return ` && sed -i '' 's/^processors:/&\\
  resource\\/wired_streams:\\
    attributes:\\
      - action: upsert\\
        key: elasticsearch.index\\
        value: logs.otel/' ./otel.yml && sed -i '' '/logs\\/platformlogs:/,/exporters:/{ /processors:/s/]/, resource\\/wired_streams]/; }' ./otel.yml`;
    }

    return ` && sed -i '' '/^[[:space:]]*elasticsearch\\/otel:/a\\
    logs_index: logs.otel' ./otel.yml`;
  })();

  switch (platform) {
    case 'linux':
      return `arch=$(if [[ $(uname -m) == "arm" || $(uname -m) == "aarch64" ]]; then echo "arm64"; else echo $(uname -m); fi)

curl --output elastic-distro-${agentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p elastic-distro-${agentVersion}-linux-$arch && tar -xvf elastic-distro-${agentVersion}-linux-$arch.tar.gz -C "elastic-distro-${agentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-linux-$arch

rm ./otel.yml && cp ${sampleConfigurationPath} ./otel.yml && mkdir -p ./data/otelcol && sed -i 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i 's#\\\${env:${elasticEndpointVarName}}#${ingestEndpointUrl}#g' ./otel.yml && sed -i 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml${wiredStreamsSedLinux}`;

    case 'mac':
      return `arch=$(if [[ $(uname -m) == "arm64" ]]; then echo "aarch64"; else echo $(uname -m); fi)

curl --output elastic-distro-${agentVersion}-darwin-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-darwin-$arch.tar.gz --proto '=https' --tlsv1.2 -fL && mkdir -p "elastic-distro-${agentVersion}-darwin-$arch" && tar -xvf elastic-distro-${agentVersion}-darwin-$arch.tar.gz -C "elastic-distro-${agentVersion}-darwin-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-darwin-$arch

rm ./otel.yml && cp ${sampleConfigurationPath} ./otel.yml && mkdir -p ./data/otelcol  && sed -i '' 's#\\\${env:STORAGE_DIR}#'"$PWD"/data/otelcol'#g' ./otel.yml && sed -i '' 's#\\\${env:${elasticEndpointVarName}}#${ingestEndpointUrl}#g' ./otel.yml && sed -i '' 's/\\\${env:ELASTIC_API_KEY}/${apiKeyEncoded}/g' ./otel.yml${wiredStreamsSedMac}`;

    case 'windows':
      const wiredStreamsWindowsCommand = (() => {
        if (!useWiredStreams) return '';
        if (isManagedOtlpServiceAvailable) {
          // Managed OTLP: inject resource/wired_streams processor and add to logs pipeline
          return `
$script:inLogsPipeline = $false
(Get-Content .\\otel.yml) | ForEach-Object {
    if ($_ -match 'logs/platformlogs:') { $script:inLogsPipeline = $true }
    if ($script:inLogsPipeline -and $_ -match '^\\s+processors: \\[') {
        $script:inLogsPipeline = $false
        $_ -replace '\\]', ', resource/wired_streams]'
    } else {
        $_
    }
    if ($_ -match '^processors:') {
        '  resource/wired_streams:'
        '    attributes:'
        '      - action: upsert'
        '        key: elasticsearch.index'
        '        value: logs.otel'
    }
} | Set-Content .\\otel.yml`;
        }
        // Non-managed: inject logs_index under elasticsearch/otel exporter
        return `
(Get-Content .\\otel.yml) | ForEach-Object {
    $_
    if ($_ -match '^\\s*elasticsearch/otel:') {
        '    logs_index: logs.otel'
    }
} | Set-Content .\\otel.yml`;
      })();

      return `$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x86_64' }
$agentName = "elastic-agent-${agentVersion}-windows-$arch"
$distro = "elastic-distro-${agentVersion}-windows-$arch"

$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest "https://${AGENT_CDN_BASE_URL}/$agentName.zip" -OutFile "$distro.zip"
Expand-Archive "$distro.zip" -DestinationPath . -Force
Rename-Item $agentName $distro -Force
Remove-Item "$distro.zip" -Force
Set-Location $distro

Copy-Item ${windowsSampleConfigurationPath} .\\otel.yml -Force
New-Item .\\data\\otelcol -ItemType Directory -Force | Out-Null

(Get-Content .\\otel.yml) -replace '\\\${env:STORAGE_DIR}', "\$PWD\\data\\otelcol" -replace '\\\${env:${elasticEndpointVarName}}', '${ingestEndpointUrl}' -replace '\\\${env:ELASTIC_API_KEY}', '${apiKeyEncoded}' | Set-Content .\\otel.yml${wiredStreamsWindowsCommand}`;
  }
}
