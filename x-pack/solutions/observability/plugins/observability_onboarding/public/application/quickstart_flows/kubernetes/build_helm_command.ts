/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Params {
  encodedApiKey: string;
  onboardingId: string;
  elasticsearchUrl: string;
  metricsEnabled: boolean;
}

export function buildHelmCommand({
  encodedApiKey,
  onboardingId,
  elasticsearchUrl,
  metricsEnabled,
}: Params) {
  const escapedElasticsearchUrl = elasticsearchUrl.replace(/\//g, '\\/');

  const metricsParameters = metricsEnabled
    ? ''
    : `
    --set kubernetes.state.enabled=false
    --set kubernetes.metrics.enabled=false
    --set kubernetes.apiserver.enabled=false
  `;

  return `
    helm repo add elastic https://helm.elastic.co/ && \
    helm install elastic-agent elastic/elastic-agent \
      -n kube-system \
      --set outputs.default.url=${escapedElasticsearchUrl} \
      --set kubernetes.onboardingID=${onboardingId} \
      --set kubernetes.enabled=true \
      --set outputs.default.type=ESPlainAuthAPI \
      --set outputs.default.api_key=$(echo "${encodedApiKey}" | base64 -d)
      ${metricsParameters}
  `
    .trim()
    .replace(/\n/g, ' ')
    .replace(/\s\s+/g, ' ');
}
