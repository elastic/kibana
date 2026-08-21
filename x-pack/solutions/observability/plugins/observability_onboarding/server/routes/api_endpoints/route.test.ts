/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isRight } from 'fp-ts/Either';
import { ApiEndpointId } from '../../../common/api_endpoints';
import {
  apiEndpointsRouteRepository,
  ensureVendorEndpointAvailable,
  hasManagedElasticsearchBulkEndpoint,
} from './route';
import { hasApiKeyPrivileges } from '../../lib/api_key/has_api_key_privileges';
import { APM_EVENT_WRITE_APPLICATION } from '../../lib/api_key/privileges';
import { resolveApiKeyFactory } from '../../lib/api_key/resolve_api_key_factory';
import { getManagedOtlpServiceUrl } from '../../lib/get_managed_otlp_service_url';
import { IS_VENDOR_ENDPOINTS_ENABLED } from '../../../common/feature_flags';

jest.mock('../../lib/get_managed_otlp_service_url', () => ({
  getManagedOtlpServiceUrl: jest.fn().mockReturnValue('https://otlp.example.com:443'),
}));
jest.mock('../../lib/get_fallback_urls', () => ({
  getFallbackESUrl: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../lib/api_key/has_api_key_privileges', () => ({
  hasApiKeyPrivileges: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../lib/api_key/has_log_monitoring_privileges', () => ({
  hasLogMonitoringPrivileges: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../lib/api_key/resolve_api_key_factory', () => ({
  resolveApiKeyFactory: jest.fn(),
}));

describe('hasManagedElasticsearchBulkEndpoint', () => {
  it('uses managed URL presence as the Elasticsearch-compatible bulk endpoint availability signal', () => {
    expect(hasManagedElasticsearchBulkEndpoint('https://otlp.example.com:443')).toBe(true);
  });

  it('treats missing or blank managed URLs as unavailable', () => {
    expect(hasManagedElasticsearchBulkEndpoint(undefined)).toBe(false);
    expect(hasManagedElasticsearchBulkEndpoint('   ')).toBe(false);
  });
});

describe('ensureVendorEndpointAvailable', () => {
  const available = { isManagedOtlpServiceAvailable: true, vendorEndpointsEnabled: true };

  it('throws for vendor endpoints when the managed OTLP service is unavailable', () => {
    expect(() =>
      ensureVendorEndpointAvailable(ApiEndpointId.Supabase, {
        ...available,
        isManagedOtlpServiceAvailable: false,
      })
    ).toThrow(/managed OTLP service/);
    expect(() =>
      ensureVendorEndpointAvailable(ApiEndpointId.Vercel, {
        ...available,
        isManagedOtlpServiceAvailable: false,
      })
    ).toThrow(/managed OTLP service/);
  });

  it('throws for vendor endpoints when the vendor endpoints flag is disabled', () => {
    expect(() =>
      ensureVendorEndpointAvailable(ApiEndpointId.Supabase, {
        ...available,
        vendorEndpointsEnabled: false,
      })
    ).toThrow(/not enabled/);
    expect(() =>
      ensureVendorEndpointAvailable(ApiEndpointId.Vercel, {
        ...available,
        vendorEndpointsEnabled: false,
      })
    ).toThrow(/not enabled/);
  });

  it('marks the failure as a 400 bad request', () => {
    let error: unknown;
    try {
      ensureVendorEndpointAvailable(ApiEndpointId.Supabase, {
        ...available,
        vendorEndpointsEnabled: false,
      });
    } catch (caught) {
      error = caught;
    }
    expect(Boom.isBoom(error as Error)).toBe(true);
    expect((error as Boom.Boom).output.statusCode).toBe(400);
  });

  it('passes vendor endpoints when the service is available and the flag is enabled', () => {
    expect(() => ensureVendorEndpointAvailable(ApiEndpointId.Supabase, available)).not.toThrow();
    expect(() => ensureVendorEndpointAvailable(ApiEndpointId.Vercel, available)).not.toThrow();
  });

  it('ignores non-vendor endpoints regardless of availability', () => {
    const unavailable = { isManagedOtlpServiceAvailable: false, vendorEndpointsEnabled: false };
    expect(() =>
      ensureVendorEndpointAvailable(ApiEndpointId.OpenTelemetry, unavailable)
    ).not.toThrow();
    expect(() =>
      ensureVendorEndpointAvailable(ApiEndpointId.Prometheus, unavailable)
    ).not.toThrow();
  });
});

const createKeyEndpoint =
  'POST /internal/observability_onboarding/api_endpoints/create_key/{id}' as const;

describe('create_key path codec', () => {
  const { params } = apiEndpointsRouteRepository[createKeyEndpoint];

  it.each(['supabase', 'vercel', 'opentelemetry', 'prometheus', 'elasticsearch'])(
    'accepts %s',
    (id) => {
      expect(isRight(params.decode({ path: { id } }))).toBe(true);
    }
  );

  it('rejects unknown ids', () => {
    expect(isRight(params.decode({ path: { id: 'netlify' } }))).toBe(false);
  });
});

describe('create_key handler', () => {
  const { handler } = apiEndpointsRouteRepository[createKeyEndpoint];

  const createResources = ({
    id,
    isServerless = true,
    vendorEndpointsEnabled = true,
  }: {
    id: ApiEndpointId;
    isServerless?: boolean;
    vendorEndpointsEnabled?: boolean;
  }) =>
    ({
      context: {
        core: Promise.resolve({
          elasticsearch: { client: { asCurrentUser: {} } },
          featureFlags: {
            getBooleanValue: jest
              .fn()
              .mockImplementation((key: string) =>
                Promise.resolve(
                  key === IS_VENDOR_ENDPOINTS_ENABLED ? vendorEndpointsEnabled : false
                )
              ),
          },
        }),
      },
      config: { serverless: { enabled: isServerless } },
      plugins: {},
      params: { path: { id } },
    } as unknown as Parameters<typeof handler>[0]);

  beforeEach(() => {
    jest.clearAllMocks();
    (getManagedOtlpServiceUrl as jest.Mock).mockReturnValue('https://otlp.example.com:443');
  });

  it.each([ApiEndpointId.Supabase, ApiEndpointId.Vercel])(
    'names vendor keys after the endpoint id for %s',
    async (id) => {
      const factory = jest.fn().mockResolvedValue({ encoded: 'encoded-key' });
      (resolveApiKeyFactory as jest.Mock).mockReturnValue(factory);

      const result = await handler(createResources({ id }));

      expect(hasApiKeyPrivileges).toHaveBeenCalledWith(expect.anything(), {
        application: [APM_EVENT_WRITE_APPLICATION],
      });
      expect(factory).toHaveBeenCalledWith(expect.anything(), `onboarding-${id}-api`);
      expect(result).toEqual({ encodedApiKey: 'encoded-key' });
    }
  );

  it('rejects vendor key creation with 400 before any privilege check when managed OTLP is unavailable', async () => {
    await expect(
      handler(createResources({ id: ApiEndpointId.Vercel, isServerless: false }))
    ).rejects.toMatchObject({ output: { statusCode: 400 } });

    expect(hasApiKeyPrivileges).not.toHaveBeenCalled();
    expect(resolveApiKeyFactory).not.toHaveBeenCalled();
  });

  it('rejects vendor key creation on serverless when the managed OTLP URL is unavailable', async () => {
    (getManagedOtlpServiceUrl as jest.Mock).mockReturnValue('');

    await expect(handler(createResources({ id: ApiEndpointId.Supabase }))).rejects.toMatchObject({
      output: { statusCode: 400 },
    });

    expect(hasApiKeyPrivileges).not.toHaveBeenCalled();
    expect(resolveApiKeyFactory).not.toHaveBeenCalled();
  });

  it.each([ApiEndpointId.Supabase, ApiEndpointId.Vercel])(
    'rejects %s key creation with 400 before any privilege check when the vendor endpoints flag is disabled',
    async (id) => {
      await expect(
        handler(createResources({ id, vendorEndpointsEnabled: false }))
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(hasApiKeyPrivileges).not.toHaveBeenCalled();
      expect(resolveApiKeyFactory).not.toHaveBeenCalled();
    }
  );
});
