/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function buildValuesFileUrl({
  isServerless,
  isCloud,
  metricsOnboardingEnabled,
  agentVersion,
}: {
  isServerless: boolean;
  isCloud: boolean;
  metricsOnboardingEnabled: boolean;
  agentVersion: string;
}): string {
  const isUsingManagedOtlpEndpoint = isServerless || isCloud;
  const valuesFileSubfolder = isUsingManagedOtlpEndpoint ? '/managed_otlp' : '';
  const valuesFileName =
    !isServerless || metricsOnboardingEnabled ? 'values.yaml' : 'logs-values.yaml';

  return `https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v${agentVersion}/deploy/helm/edot-collector/kube-stack${valuesFileSubfolder}/${valuesFileName}`;
}
