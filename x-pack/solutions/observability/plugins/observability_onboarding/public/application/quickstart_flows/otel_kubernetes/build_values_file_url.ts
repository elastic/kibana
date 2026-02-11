/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function buildValuesFileUrl({
  isMetricsOnboardingEnabled,
  isManagedOtlpServiceAvailable,
  agentVersion,
}: {
  isMetricsOnboardingEnabled: boolean;
  isManagedOtlpServiceAvailable: boolean;
  agentVersion: string;
}): string {
  const valuesFileSubfolder = isManagedOtlpServiceAvailable ? '/managed_otlp' : '';
  const valuesFileName = isMetricsOnboardingEnabled ? 'values.yaml' : 'logs-values.yaml';

  return `https://raw.githubusercontent.com/elastic/elastic-agent/refs/tags/v${agentVersion}/deploy/helm/edot-collector/kube-stack${valuesFileSubfolder}/${valuesFileName}`;
}
