/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_ENDPOINTS, type ApiEndpointContext } from './endpoints_config';

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
  ...overrides,
});

describe('API_ENDPOINTS', () => {
  describe('visibility matrix', () => {
    it('always shows Elasticsearch', () => {
      expect(getEndpoint('elasticsearch').isVisible(createContext())).toBe(true);
      expect(
        getEndpoint('elasticsearch').isVisible(
          createContext({ isManagedOtlpServiceAvailable: true })
        )
      ).toBe(true);
    });

    it('always shows Prometheus', () => {
      expect(getEndpoint('prometheus').isVisible(createContext())).toBe(true);
      expect(
        getEndpoint('prometheus').isVisible(createContext({ isManagedOtlpServiceAvailable: true }))
      ).toBe(true);
    });

    it('shows OpenTelemetry only when the managed OTLP service is available', () => {
      expect(
        getEndpoint('opentelemetry').isVisible(
          createContext({ isManagedOtlpServiceAvailable: false })
        )
      ).toBe(false);
      expect(
        getEndpoint('opentelemetry').isVisible(
          createContext({ isManagedOtlpServiceAvailable: true })
        )
      ).toBe(true);
    });
  });

  describe('getUrl', () => {
    it('returns the Elasticsearch URL unchanged', () => {
      expect(
        getEndpoint('elasticsearch').getUrl(
          createContext({ elasticsearchUrl: 'https://es.example.com' })
        )
      ).toBe('https://es.example.com');
    });

    it('returns the managed OTLP URL for OpenTelemetry', () => {
      expect(
        getEndpoint('opentelemetry').getUrl(
          createContext({ managedOtlpServiceUrl: 'https://otlp.example.com:443' })
        )
      ).toBe('https://otlp.example.com:443');
    });

    describe('Prometheus remote write URL', () => {
      it('derives the on-prem URL from the Elasticsearch URL', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: false,
              elasticsearchUrl: 'https://es.example.com',
            })
          )
        ).toBe('https://es.example.com/_prometheus/api/v1/write');
      });

      it('trims trailing slashes from the Elasticsearch URL', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: false,
              elasticsearchUrl: 'https://es.example.com//',
            })
          )
        ).toBe('https://es.example.com/_prometheus/api/v1/write');
      });

      it('derives the managed URL from the managed OTLP URL', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: true,
              managedOtlpServiceUrl: 'https://otlp.example.com:443',
            })
          )
        ).toBe('https://otlp.example.com:443/api/v1/write');
      });

      it('prefers the on-prem URL when the managed OTLP URL is missing', () => {
        expect(
          getEndpoint('prometheus').getUrl(
            createContext({
              isManagedOtlpServiceAvailable: true,
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
