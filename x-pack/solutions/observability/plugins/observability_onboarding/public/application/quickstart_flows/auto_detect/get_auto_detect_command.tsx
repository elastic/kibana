/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, zip } from 'lodash';
import { useOnboardingFlow } from './use_onboarding_flow';

export function getAutoDetectCommand(
  options: NonNullable<ReturnType<typeof useOnboardingFlow>['data']>
) {
  const scriptName = 'auto_detect.sh';
  return oneLine`
    curl ${options.scriptDownloadUrl} -so ${scriptName} &&
    sudo bash ${scriptName}
      --id=${options.onboardingFlow.id}
      --kibana-url=${options.kibanaUrl}
      --install-key=${options.installApiKey}
      --ingest-key=${options.ingestApiKey}
      --ea-version=${options.elasticAgentVersionInfo.agentVersion}
  `;
}
function oneLine(parts: TemplateStringsArray, ...args: string[]) {
  const str = flatten(zip(parts, args)).join('');
  return str.replace(/\s+/g, ' ').trim();
}
