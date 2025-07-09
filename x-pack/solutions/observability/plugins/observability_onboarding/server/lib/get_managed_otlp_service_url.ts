/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { ObservabilityOnboardingRouteHandlerResources } from '../routes/types';

/**
 * Managed OTLP service endpoint is not exposed yet
 * separately, so we need to construct it from the APM
 * service endpoint by replacing .apm with .ingest.
 * Once https://github.com/elastic/cloud/issues/137354 is
 * implemented, we can get the URL from the Cloud plugin.
 */
export async function getManagedOtlpServiceUrl({
  plugins,
}: ObservabilityOnboardingRouteHandlerResources): Promise<string> {
  if (!plugins.apm) {
    return '';
  }

  const managedApmServiceUrl = await firstValueFrom(plugins.apm.setup.config$).then((apmConfig) => {
    return apmConfig.managedServiceUrl;
  });

  if (!managedApmServiceUrl) {
    return '';
  }

  const urlParts = managedApmServiceUrl.split('.');

  return `${urlParts[0]}.ingest.${urlParts.slice(2).join('.')}:443`;
}
