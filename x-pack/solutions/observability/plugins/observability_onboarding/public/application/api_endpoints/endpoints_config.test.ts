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
  describe('getUrl', () => {
    it('returns the Elasticsearch URL unchanged', () => {
      expect(
        getEndpoint('elasticsearch').getUrl(
          createContext({ elasticsearchUrl: 'https://es.example.com' })
        )
      ).toBe('https://es.example.com');
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
