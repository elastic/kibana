/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityOnboardingAppServices } from '../../..';

interface Props {
  elasticsearchUrl?: string;
  managedServiceUrl?: string;
}

export function useIngestEndpointUrl({ elasticsearchUrl, managedServiceUrl }: Props): string {
  const {
    services: {
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  if (!elasticsearchUrl || !managedServiceUrl) {
    return '';
  }

  return isServerless ? convertApmUrlToOtelUrl(managedServiceUrl) : elasticsearchUrl;
}

/**
 * Managed OTel collector endpoint is not exposed yet
 * separately, so we need to construct it from the APM
 * service endpoint by replacing .apm with .ingest.
 * Once https://github.com/elastic/cloud/issues/137354 is
 * implemented, we can get the URL from the Cloud plugin.
 */
function convertApmUrlToOtelUrl(apmUrl: string): string {
  const urlParts = apmUrl.split('.');

  return `${urlParts[0]}.ingest.${urlParts.slice(2).join('.')}`;
}
