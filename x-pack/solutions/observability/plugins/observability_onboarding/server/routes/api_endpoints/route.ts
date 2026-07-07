/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
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
  IS_MANAGED_OTLP_SERVICE_ENABLED,
  IS_MANAGED_OTLP_SERVICE_PRW_ENDPOINT_ENABLED,
} from '../../../common/feature_flags';
import { createVerificationForKey } from '../../lib/api_endpoints/create_verification_for_key';
import { registerCollectorWatch } from '../../lib/api_endpoints/register_collector_watch';
import { handleReceipt } from '../../lib/api_endpoints/handle_receipt';
import {
  handleVerification,
  type ApiEndpointVerificationResponse,
} from '../../lib/api_endpoints/handle_verification';

export interface ApiEndpointsRouteResponse {
  elasticsearchUrl: string;
  managedOtlpServiceUrl: string;
}

export interface ApiEndpointApiKeyResponse {
  encodedApiKey: string;
  apiKeyId: string;
  verificationId: string;
  detectionActive: boolean;
}

function hasRequiredPrivileges(
  id: ApiEndpointId,
  {
    isManagedOtlpServiceAvailable,
    isServerless,
    managedOtlpPrwEndpointEnabled,
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
      return hasLogMonitoringPrivileges(esClient, true);
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

    const apiKeyFactoryContext: ApiKeyFactoryContext = {
      isManagedOtlpServiceAvailable,
      isServerless,
      managedOtlpPrwEndpointEnabled,
    };

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

    const { verificationId, detectionActive } = await createVerificationForKey(
      {
        store: resources.services.verificationStore,
        registerWatch: registerCollectorWatch,
        logger: resources.logger,
      },
      {
        apiKeyId,
        endpointId: id,
        apiEndpointsConfig: config.apiEndpoints,
        cloudSetup: plugins.cloud?.setup,
      }
    );

    return { encodedApiKey: encoded, apiKeyId, verificationId, detectionActive };
  },
});

const receiptRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/api_endpoints/receipt',
  options: {
    xsrfRequired: false,
  },
  security: {
    authc: {
      enabled: false,
      reason: 'Receipt calls are authenticated with a plugin-level bearer token.',
    },
    authz: {
      enabled: false,
      reason:
        'Receipt calls are authenticated with a plugin-level bearer token and do not access user-scoped resources.',
    },
  },
  params: t.type({
    body: t.intersection([
      t.type({
        verificationId: t.string,
        apiKeyId: t.string,
        endpointId: t.string,
        ingestPath: t.string,
        status: t.literal('accepted'),
      }),
      t.partial({
        signal: t.string,
        receivedAt: t.string,
      }),
    ]),
  }),
  async handler(resources): Promise<{}> {
    const {
      config,
      request,
      services: { verificationStore },
      params: { body },
    } = resources;

    const authorizationHeader =
      typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined;

    const result = handleReceipt({
      store: verificationStore,
      collectorToKibanaToken: config.apiEndpoints.collectorToKibanaToken,
      authorizationHeader,
      body,
    });

    if (result.statusCode === 503) {
      throw Boom.serverUnavailable('Receipt verification is not configured');
    }
    if (result.statusCode === 401) {
      throw Boom.unauthorized('Invalid receipt token');
    }
    return {};
  },
});

const verificationRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/api_endpoints/verification/{verificationId}',
  security: {
    authz: {
      enabled: false,
      reason:
        'Returns only opaque verification status keyed by an unguessable verificationId and accesses no user-scoped resources',
    },
  },
  params: t.type({
    path: t.type({
      verificationId: t.string,
    }),
  }),
  async handler(resources): Promise<ApiEndpointVerificationResponse> {
    const {
      services: { verificationStore },
      params: {
        path: { verificationId },
      },
    } = resources;

    return handleVerification({ store: verificationStore, verificationId });
  },
});

export const apiEndpointsRouteRepository = {
  ...apiEndpointsRoute,
  ...createApiKeyRoute,
  ...receiptRoute,
  ...verificationRoute,
};
