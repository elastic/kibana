/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { i18n } from '@kbn/i18n';
import { ApiEndpointId } from '../../../common/api_endpoints';
import type { SupportedLogo } from '../shared/logo_icon';

export interface ApiEndpointContext {
  elasticsearchUrl?: string;
  managedOtlpServiceUrl?: string;
  isManagedOtlpServiceAvailable: boolean;
  isServerless: boolean;
  managedOtlpPrwEndpointEnabled: boolean;
}

export interface ApiEndpointDefinition {
  id: ApiEndpointId;
  label: string;
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  getUrl: (context: ApiEndpointContext) => string | undefined;
  usesManagedInput: (context: ApiEndpointContext) => boolean;
}

const trimTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');
const normalizeEndpointUrl = (url?: string): string | undefined => {
  const trimmedUrl = url?.trim();
  return trimmedUrl ? trimTrailingSlashes(trimmedUrl) : undefined;
};
const getManagedElasticsearchCompatibleUrl = ({
  managedOtlpServiceUrl,
}: ApiEndpointContext): string | undefined => {
  const managedUrl = normalizeEndpointUrl(managedOtlpServiceUrl);

  return managedUrl ? `${managedUrl}/_es` : undefined;
};

const elasticsearchLabel = i18n.translate(
  'xpack.observability_onboarding.apiEndpoints.elasticsearch.label',
  {
    defaultMessage: 'Elasticsearch',
  }
);

export const API_ENDPOINTS: readonly ApiEndpointDefinition[] = [
  {
    id: ApiEndpointId.Prometheus,
    label: i18n.translate('xpack.observability_onboarding.apiEndpoints.prometheus.label', {
      defaultMessage: 'Prometheus',
    }),
    logo: 'prometheus',
    usesManagedInput: ({ isServerless, managedOtlpServiceUrl, managedOtlpPrwEndpointEnabled }) =>
      Boolean(managedOtlpServiceUrl) && (isServerless || managedOtlpPrwEndpointEnabled),
    getUrl: ({
      isServerless,
      managedOtlpServiceUrl,
      elasticsearchUrl,
      managedOtlpPrwEndpointEnabled,
    }) => {
      // Serverless or ECH with mOTLP PRW endpoint enabled
      if (managedOtlpServiceUrl && (isServerless || managedOtlpPrwEndpointEnabled)) {
        return `${trimTrailingSlashes(managedOtlpServiceUrl)}/api/v1/write`;
      }
      // ECH with mOTLP PRW endpoint disabled or on-prem
      if (elasticsearchUrl) {
        return `${trimTrailingSlashes(elasticsearchUrl)}/_prometheus/api/v1/write`;
      }
      return undefined;
    },
  },
  {
    id: ApiEndpointId.OpenTelemetry,
    label: i18n.translate('xpack.observability_onboarding.apiEndpoints.openTelemetry.label', {
      defaultMessage: 'OpenTelemetry',
    }),
    logo: 'opentelemetry',
    usesManagedInput: ({ isManagedOtlpServiceAvailable, managedOtlpServiceUrl }) =>
      isManagedOtlpServiceAvailable && Boolean(managedOtlpServiceUrl),
    getUrl: ({ isManagedOtlpServiceAvailable, managedOtlpServiceUrl, elasticsearchUrl }) => {
      if (isManagedOtlpServiceAvailable && managedOtlpServiceUrl) {
        return managedOtlpServiceUrl;
      }
      if (elasticsearchUrl) {
        return `${trimTrailingSlashes(elasticsearchUrl)}/_otlp`;
      }
      return undefined;
    },
  },
  {
    id: ApiEndpointId.Elasticsearch,
    label: elasticsearchLabel,
    euiIconType: 'logoElasticsearch',
    usesManagedInput: (context) => Boolean(getManagedElasticsearchCompatibleUrl(context)),
    getUrl: (context) => {
      const managedUrl = getManagedElasticsearchCompatibleUrl(context);
      if (managedUrl) {
        return managedUrl;
      }
      const { elasticsearchUrl } = context;
      const fallbackUrl = normalizeEndpointUrl(elasticsearchUrl);

      return fallbackUrl;
    },
  },
];
