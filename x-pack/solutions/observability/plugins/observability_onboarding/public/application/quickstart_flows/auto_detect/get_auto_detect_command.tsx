/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, zip } from 'lodash';

export function getAutoDetectCommand({
  scriptDownloadUrl,
  onboardingId,
  kibanaUrl,
  installApiKey,
  ingestApiKey,
  elasticAgentVersion,
  metricsEnabled,
}: {
  scriptDownloadUrl: string;
  onboardingId: string;
  kibanaUrl: string;
  installApiKey: string;
  ingestApiKey: string;
  elasticAgentVersion: string;
  metricsEnabled: boolean;
}) {
  const scriptName = 'auto_detect.sh';
  return oneLine`
    curl ${scriptDownloadUrl} -so ${scriptName} &&
    sudo bash ${scriptName}
      --id=${onboardingId}
      --kibana-url=${kibanaUrl}
      --install-key=${installApiKey}
      --ingest-key=${ingestApiKey}
      --ea-version=${elasticAgentVersion}
      ${!metricsEnabled ? '--metrics-enabled=false' : ''}
  `;
}
function oneLine(parts: TemplateStringsArray, ...args: string[]) {
  const str = flatten(zip(parts, args)).join('');
  return str.replace(/\s+/g, ' ').trim();
}
