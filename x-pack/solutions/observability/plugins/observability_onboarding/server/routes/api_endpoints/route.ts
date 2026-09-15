/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';
import {
  resolveApiKeyFactory,
  type ApiKeyFactoryContext,
} from '../../lib/api_key/resolve_api_key_factory';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { hasApiKeyPrivileges } from '../../lib/api_key/has_api_key_privileges';
import {
  APM_EVENT_WRITE_APPLICATION,
  INDEX_OTLP_LOGS_METRICS_AND_TRACES,
  INDEX_PROMETHEUS_REMOTE_WRITE,
} from '../../lib/api_key/privileges';
import { ApiEndpointId } from '../../../common/api_endpoints';
import {
  INGEST_RECEIPTS_DATA_STREAM,
  INGEST_RECEIPTS_RECENCY_WINDOW,
  INGEST_RECEIPT_FIELDS,
} from '../../../common/ingest_receipts';
import {
  IS_MANAGED_OTLP_SERVICE_ENABLED,
  IS_MANAGED_OTLP_SERVICE_PRW_ENDPOINT_ENABLED,
  IS_VENDOR_ENDPOINTS_ENABLED,
} from '../../../common/feature_flags';

export interface ApiEndpointsRouteResponse {
  elasticsearchUrl: string;
  managedOtlpServiceUrl: string;
}

export interface ApiEndpointApiKeyResponse {
  apiKeyId: string;
  encodedApiKey: string;
}

export interface ApiEndpointVerificationResponse {
  received: boolean;
  lastReceivedAt?: string;
}

const MAX_API_KEY_ID_LENGTH = 64;

// ES-compatible bulk availability is based on managed ingest URL presence, not the legacy OTLP feature flag.
export const hasManagedElasticsearchBulkEndpoint = (managedOtlpServiceUrl?: string): boolean =>
  Boolean(managedOtlpServiceUrl?.trim());

const VENDOR_ENDPOINT_IDS: readonly ApiEndpointId[] = [
  ApiEndpointId.Supabase,
  ApiEndpointId.Vercel,
];

export interface VendorEndpointAvailability {
  isManagedOtlpServiceAvailable: boolean;
  vendorEndpointsEnabled: boolean;
}

// Vendor paths only exist on the managed OTLP collector, so a key for them is
// useless anywhere else. The UI never offers creation in that state, this
// guard makes the API honest anyway.
export function ensureVendorEndpointAvailable(
  id: ApiEndpointId,
  { isManagedOtlpServiceAvailable, vendorEndpointsEnabled }: VendorEndpointAvailability
): void {
  if (!VENDOR_ENDPOINT_IDS.includes(id)) {
    return;
  }
  if (!vendorEndpointsEnabled) {
    throw Boom.badRequest(`The ${id} endpoint is not enabled on this deployment.`);
  }
  if (!isManagedOtlpServiceAvailable) {
    throw Boom.badRequest(
      `The ${id} endpoint requires the managed OTLP service, which is not available on this deployment.`
    );
  }
}

function hasRequiredPrivileges(
  id: ApiEndpointId,
  {
    isManagedOtlpServiceAvailable,
    isServerless,
    managedOtlpPrwEndpointEnabled,
    isManagedElasticsearchBulkEndpointAvailable,
  }: ApiKeyFactoryContext,
  esClient: ElasticsearchClient
): Promise<boolean> {
  switch (id) {
    case ApiEndpointId.OpenTelemetry:
      return isManagedOtlpServiceAvailable
        ? hasApiKeyPrivileges(esClient, { application: [APM_EVENT_WRITE_APPLICATION] })
        : hasApiKeyPrivileges(esClient, { index: [INDEX_OTLP_LOGS_METRICS_AND_TRACES] });
    case ApiEndpointId.Prometheus:
      return isServerless || managedOtlpPrwEndpointEnabled
        ? hasApiKeyPrivileges(esClient, { application: [APM_EVENT_WRITE_APPLICATION] })
        : hasApiKeyPrivileges(esClient, { index: [INDEX_PROMETHEUS_REMOTE_WRITE] });
    case ApiEndpointId.Elasticsearch:
      return isManagedElasticsearchBulkEndpointAvailable
        ? hasApiKeyPrivileges(esClient, { application: [APM_EVENT_WRITE_APPLICATION] })
        : hasLogMonitoringPrivileges(esClient, true);
    case ApiEndpointId.Supabase:
    case ApiEndpointId.Vercel:
      return hasApiKeyPrivileges(esClient, { application: [APM_EVENT_WRITE_APPLICATION] });
  }
}

const apiEndpointsRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/api_endpoints',
  security: {
    authz: {
      enabled: false,
      reason:
        'This route only returns deployment-level configuration URLs (Elasticsearch and managed OTLP service) that are already exposed by other onboarding routes',
    },
  },
  async handler(resources): Promise<ApiEndpointsRouteResponse> {
    const { plugins, services } = resources;

    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud.setup.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    return {
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      managedOtlpServiceUrl: getManagedOtlpServiceUrl(plugins),
    };
  },
});

const createApiKeyRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/api_endpoints/create_key/{id}',
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by custom logic using the Elasticsearch client',
    },
  },
  params: t.type({
    path: t.type({
      id: t.keyof({
        [ApiEndpointId.Prometheus]: null,
        [ApiEndpointId.OpenTelemetry]: null,
        [ApiEndpointId.Elasticsearch]: null,
        [ApiEndpointId.Supabase]: null,
        [ApiEndpointId.Vercel]: null,
      }),
    }),
  }),
  async handler(resources): Promise<ApiEndpointApiKeyResponse> {
    const {
      context,
      config,
      plugins,
      params: {
        path: { id },
      },
    } = resources;
    const {
      elasticsearch: { client },
      featureFlags,
    } = await context.core;

    const isServerless = config.serverless.enabled;
    const managedOtlpServiceUrl = getManagedOtlpServiceUrl(plugins);
    const isManagedOtlpServiceAvailable =
      isServerless ||
      ((await featureFlags.getBooleanValue(IS_MANAGED_OTLP_SERVICE_ENABLED, false)) &&
        Boolean(managedOtlpServiceUrl));
    const managedOtlpPrwEndpointEnabled =
      (await featureFlags.getBooleanValue(IS_MANAGED_OTLP_SERVICE_PRW_ENDPOINT_ENABLED, false)) &&
      Boolean(managedOtlpServiceUrl);
    const vendorEndpointsEnabled = await featureFlags.getBooleanValue(
      IS_VENDOR_ENDPOINTS_ENABLED,
      false
    );
    const isManagedElasticsearchBulkEndpointAvailable =
      hasManagedElasticsearchBulkEndpoint(managedOtlpServiceUrl);
    const isVendorEndpointAvailable =
      isManagedOtlpServiceAvailable && Boolean(managedOtlpServiceUrl);

    const apiKeyFactoryContext: ApiKeyFactoryContext = {
      isManagedOtlpServiceAvailable,
      isServerless,
      managedOtlpPrwEndpointEnabled,
      isManagedElasticsearchBulkEndpointAvailable,
    };

    ensureVendorEndpointAvailable(id, {
      isManagedOtlpServiceAvailable: isVendorEndpointAvailable,
      vendorEndpointsEnabled,
    });

    const hasPrivileges = await hasRequiredPrivileges(
      id,
      apiKeyFactoryContext,
      client.asCurrentUser
    );
    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to create an API key. Contact your system administrator to grant you the required privileges."
      );
    }

    const createApiKey = resolveApiKeyFactory(id, apiKeyFactoryContext);
    const { id: apiKeyId, encoded } = await createApiKey(
      client.asCurrentUser,
      `onboarding-${id}-api`
    );

    return { apiKeyId, encodedApiKey: encoded };
  },
});

const verificationRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/api_endpoints/verification',
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by custom logic using the Elasticsearch client',
    },
  },
  params: t.type({
    query: t.type({
      apiKeyId: t.string,
      endpointId: t.keyof({
        [ApiEndpointId.Prometheus]: null,
        [ApiEndpointId.OpenTelemetry]: null,
        [ApiEndpointId.Elasticsearch]: null,
      }),
    }),
  }),
  async handler(resources): Promise<ApiEndpointVerificationResponse> {
    const {
      context,
      params: {
        query: { apiKeyId, endpointId },
      },
    } = resources;

    if (apiKeyId.length > MAX_API_KEY_ID_LENGTH) {
      throw Boom.badRequest('The apiKeyId parameter is too long.');
    }

    const {
      elasticsearch: { client },
    } = await context.core;

    // Receipts are readable by the internal user only, so ownership has to be established first.
    // An id the caller does not own is reported as missing so the route cannot be used to probe ids.
    const ownedApiKeys = await client.asCurrentUser.security
      .getApiKey({ id: apiKeyId, owner: true, active_only: true })
      .then(({ api_keys: apiKeys }) => apiKeys)
      // Elasticsearch answers 404 for an id that does not exist at all, which tells the caller
      // exactly as much as an id owned by somebody else.
      .catch((error) => {
        if (isResponseError(error) && error.statusCode === 404) {
          return [];
        }
        throw error;
      });
    if (ownedApiKeys.length === 0) {
      throw Boom.notFound();
    }

    const response = await client.asInternalUser.search<{ '@timestamp': string }>({
      index: INGEST_RECEIPTS_DATA_STREAM,
      ignore_unavailable: true,
      size: 1,
      sort: [{ [INGEST_RECEIPT_FIELDS.timestamp]: 'desc' }],
      _source: [INGEST_RECEIPT_FIELDS.timestamp],
      query: {
        bool: {
          filter: [
            { term: { [INGEST_RECEIPT_FIELDS.apiKeyId]: apiKeyId } },
            { term: { [INGEST_RECEIPT_FIELDS.endpointId]: endpointId } },
            {
              range: {
                [INGEST_RECEIPT_FIELDS.timestamp]: {
                  gte: `now-${INGEST_RECEIPTS_RECENCY_WINDOW}`,
                },
              },
            },
          ],
        },
      },
    });

    const [latestReceipt] = response.hits.hits;
    if (!latestReceipt) {
      return { received: false };
    }

    return {
      received: true,
      lastReceivedAt: latestReceipt._source?.[INGEST_RECEIPT_FIELDS.timestamp],
    };
  },
});

export const apiEndpointsRouteRepository = {
  ...apiEndpointsRoute,
  ...createApiKeyRoute,
  ...verificationRoute,
};
