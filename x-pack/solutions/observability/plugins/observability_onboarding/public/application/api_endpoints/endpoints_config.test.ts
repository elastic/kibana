/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiEndpointId } from '../../../common/api_endpoints';
import {
  API_ENDPOINTS,
  getPopoverVendorEndpoints,
  getVendorEndpointsForTab,
  type ApiEndpointContext,
} from './endpoints_config';

const getEndpoint = (id: string) => {
  const endpoint = API_ENDPOINTS.find((definition) => definition.id === id);
  if (!endpoint) {
    throw new Error(`No endpoint definition found for id "${id}"`);
  }
  return endpoint;
};

const createContext = (overrides: Partial<ApiEndpointContext> = {}): ApiEndpointContext => ({
  elasticsearchUrl: undefined,
  managedOtlpServiceUrl: undefined,
  isManagedOtlpServiceAvailable: false,
  isServerless: false,
  managedOtlpPrwEndpointEnabled: false,
  vendorEndpointsEnabled: true,
  ...overrides,
});

describe('API_ENDPOINTS', () => {
  describe('labels', () => {
    it('labels the Elasticsearch endpoint as Elasticsearch by default', () => {
      expect(getEndpoint('elasticsearch').label).toBe('Elasticsearch');
    });
  });

  describe('getUrl', () => {
    describe('Elasticsearch URL', () => {
      it('uses the managed Elasticsearch-compatible endpoint when the managed URL is configured on non-Serverless deployments', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: false,
              elasticsearchUrl: 'https://es.example.com',
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
            })
          )
        ).toBe('https://otlp.example.com:443/_es');
      });

      it('uses the managed Elasticsearch-compatible endpoint when the managed OTLP service is available on non-Serverless deployments', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: false,
              isManagedOtlpServiceAvailable: true,
              elasticsearchUrl: 'https://es.example.com',
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
            })
          )
        ).toBe('https://otlp.example.com:443/_es');
      });

      it('trims trailing slashes from the Elasticsearch URL fallback', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: false,
              elasticsearchUrl: 'https://es.example.com//',
            })
          )
        ).toBe('https://es.example.com');
      });

      it('uses the managed Elasticsearch-compatible endpoint on Serverless', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: true,
              isManagedOtlpServiceAvailable: true,
              elasticsearchUrl: 'https://es.example.com',
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
            })
          )
        ).toBe('https://otlp.example.com:443/_es');
      });

      it('trims trailing slashes from the managed URL before appending the managed Elasticsearch-compatible path', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: true,
              isManagedOtlpServiceAvailable: true,
              elasticsearchUrl: 'https://es.example.com',
              managedOtlpServiceUrl: 'https://otlp.example.com:443//',
            })
          )
        ).toBe('https://otlp.example.com:443/_es');
      });

      it('falls back to the Elasticsearch URL when the managed URL is missing', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: false,
              elasticsearchUrl: 'https://es.example.com',
              managedOtlpServiceUrl: undefined,
            })
          )
        ).toBe('https://es.example.com');
      });

      it('falls back to the Elasticsearch URL when the managed URL is blank', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: false,
              elasticsearchUrl: 'https://es.example.com',
              managedOtlpServiceUrl: '   ',
            })
          )
        ).toBe('https://es.example.com');
      });

      it('returns undefined when no Elasticsearch URL can be derived', () => {
        expect(
          getEndpoint('elasticsearch').getUrl(
            createContext({
              isServerless: true,
              elasticsearchUrl: undefined,
              managedOtlpServiceUrl: undefined,
            })
          )
        ).toBeUndefined();
      });
    });

    describe('OpenTelemetry URL', () => {
      it('returns the managed OTLP URL when the managed service is available', () => {
        expect(
          getEndpoint('opentelemetry').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: true,
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
            })
          )
        ).toBe('https://otlp.example.com:443');
      });

      it('falls back to the Elasticsearch OTLP endpoint when the managed service is unavailable', () => {
        expect(
          getEndpoint('opentelemetry').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: false,
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://es.example.com/_otlp');
      });

      it('trims trailing slashes from the Elasticsearch URL in the fallback', () => {
        expect(
          getEndpoint('opentelemetry').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: false,
              elasticsearchUrl: 'https://es.example.com//',
            })
          )
        ).toBe('https://es.example.com/_otlp');
      });

      it('falls back to the Elasticsearch OTLP endpoint when the managed OTLP URL is missing', () => {
        expect(
          getEndpoint('opentelemetry').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: true,
              managedOtlpServiceUrl: undefined,
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://es.example.com/_otlp');
      });

      it('returns undefined when no URL can be derived', () => {
        expect(getEndpoint('opentelemetry').getUrl(createContext())).toBeUndefined();
      });
    });

    describe('Prometheus remote write URL', () => {
      it('derives the ES-native URL from the Elasticsearch URL on non-Serverless deployments', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isServerless: false,
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://es.example.com/_prometheus/api/v1/write');
      });

      it('trims trailing slashes from the Elasticsearch URL', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isServerless: false,
              elasticsearchUrl: 'https://es.example.com//',
            })
          )
        ).toBe('https://es.example.com/_prometheus/api/v1/write');
      });

      it('uses the managed OTLP URL on Serverless', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isServerless: true,
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
            })
          )
        ).toBe('https://otlp.example.com:443/api/v1/write');
      });

      it('uses the ES-native URL when not Serverless and the managed OTLP PRW endpoint is disabled', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isServerless: false,
              isManagedOtlpServiceAvailable: true,
              managedOtlpPrwEndpointEnabled: false,
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://es.example.com/_prometheus/api/v1/write');
      });

      it('uses the managed OTLP URL on ECH when the managed OTLP PRW endpoint is enabled', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isServerless: false,
              managedOtlpPrwEndpointEnabled: true,
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://otlp.example.com:443/api/v1/write');
      });

      it('falls back to the ES-native URL when the managed OTLP PRW endpoint is enabled but the managed OTLP URL is missing', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isServerless: false,
              managedOtlpPrwEndpointEnabled: true,
              managedOtlpServiceUrl: undefined,
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://es.example.com/_prometheus/api/v1/write');
      });

      it('falls back to the ES-native URL on Serverless when the managed OTLP URL is missing', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isServerless: true,
              managedOtlpServiceUrl: undefined,
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://es.example.com/_prometheus/api/v1/write');
      });

      it('returns undefined when no URL can be derived', () => {
        expect(getEndpoint('prometheus').getUrl(createContext())).toBeUndefined();
      });
    });
  });
});

describe('vendor endpoints', () => {
  const managedContext = createContext({
    isManagedOtlpServiceAvailable: true,
    managedOtlpServiceUrl: 'https://otlp.example.com:443',
  });

  describe('getPopoverVendorEndpoints', () => {
    it('resolves Supabase and Vercel when the managed OTLP service is available', () => {
      const endpoints = getPopoverVendorEndpoints(managedContext);

      expect(endpoints).toEqual([
        {
          id: ApiEndpointId.Supabase,
          cardTitle: 'Supabase',
          fieldLabel: 'Supabase logs endpoint',
          logo: 'supabase',
          url: 'https://otlp.example.com:443/inputs/supabase/_default_/v1/logs',
        },
        {
          id: ApiEndpointId.Vercel,
          cardTitle: 'Vercel',
          fieldLabel: 'Vercel endpoint',
          logo: 'vercel_black',
          darkLogo: 'vercel_white',
          url: 'https://otlp.example.com:443/inputs/vercel/_default_',
        },
      ]);
    });

    it('returns an empty list when the managed OTLP service is unavailable', () => {
      expect(
        getPopoverVendorEndpoints(
          createContext({ managedOtlpServiceUrl: 'https://otlp.example.com:443' })
        )
      ).toEqual([]);
    });

    it('returns an empty list when the managed URL is missing or blank', () => {
      expect(
        getPopoverVendorEndpoints(createContext({ isManagedOtlpServiceAvailable: true }))
      ).toEqual([]);
      expect(
        getPopoverVendorEndpoints(
          createContext({ isManagedOtlpServiceAvailable: true, managedOtlpServiceUrl: '   ' })
        )
      ).toEqual([]);
    });

    it('trims trailing slashes from the managed URL', () => {
      const endpoints = getPopoverVendorEndpoints(
        createContext({
          isManagedOtlpServiceAvailable: true,
          managedOtlpServiceUrl: 'https://otlp.example.com:443//',
        })
      );

      expect(endpoints[0].url).toBe(
        'https://otlp.example.com:443/inputs/supabase/_default_/v1/logs'
      );
    });

    it('returns an empty list when the vendor endpoints flag is disabled', () => {
      expect(
        getPopoverVendorEndpoints(
          createContext({
            isManagedOtlpServiceAvailable: true,
            managedOtlpServiceUrl: 'https://otlp.example.com:443',
            vendorEndpointsEnabled: false,
          })
        )
      ).toEqual([]);
    });
  });

  describe('getVendorEndpointsForTab', () => {
    it('places Supabase but not Vercel on the OpenTelemetry tab', () => {
      const endpoints = getVendorEndpointsForTab(ApiEndpointId.OpenTelemetry, managedContext);

      expect(endpoints.map((endpoint) => endpoint.id)).toEqual([ApiEndpointId.Supabase]);
    });

    it('places nothing on the Prometheus and Elasticsearch tabs', () => {
      expect(getVendorEndpointsForTab(ApiEndpointId.Prometheus, managedContext)).toEqual([]);
      expect(getVendorEndpointsForTab(ApiEndpointId.Elasticsearch, managedContext)).toEqual([]);
    });

    it('places nothing when the managed OTLP service is unavailable', () => {
      expect(
        getVendorEndpointsForTab(
          ApiEndpointId.OpenTelemetry,
          createContext({ managedOtlpServiceUrl: 'https://otlp.example.com:443' })
        )
      ).toEqual([]);
    });

    it('returns an empty list when the vendor endpoints flag is disabled', () => {
      expect(
        getVendorEndpointsForTab(
          ApiEndpointId.OpenTelemetry,
          createContext({
            isManagedOtlpServiceAvailable: true,
            managedOtlpServiceUrl: 'https://otlp.example.com:443',
            vendorEndpointsEnabled: false,
          })
        )
      ).toEqual([]);
    });
  });
});
