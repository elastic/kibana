/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useOtelIngestEndpointUrl } from './use_otel_ingest_endpoint_url';

const createWrapper = ({ isServerless }: { isServerless: boolean }) => {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <KibanaContextProvider
        services={{
          context: { isServerless },
        }}
      >
        {children}
      </KibanaContextProvider>
    );
  };
};

describe('useOtelIngestEndpointUrl', () => {
  it('returns ES endpoint when not on Serverless', () => {
    const { result } = renderHook(
      () =>
        useOtelIngestEndpointUrl({
          elasticsearchUrl: 'http://elasticsearch',
          managedServiceUrl: 'https://e2e-tests-c045db.apm.us-east-1.aws.elastic.cloud:443',
        }),
      {
        wrapper: createWrapper({ isServerless: false }),
      }
    );

    expect(result.current).toBe('http://elasticsearch');
  });

  it('returns APM endpoint with replaced sub-domain when on Serverless', () => {
    const { result } = renderHook(
      () =>
        useOtelIngestEndpointUrl({
          elasticsearchUrl: 'http://elasticsearch',
          managedServiceUrl: 'https://e2e-tests-c045db.apm.us-east-1.aws.elastic.cloud:443',
        }),
      {
        wrapper: createWrapper({ isServerless: true }),
      }
    );

    expect(result.current).toBe('https://e2e-tests-c045db.ingest.us-east-1.aws.elastic.cloud:443');
  });
});
