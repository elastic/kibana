/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import type { HostMetadata } from '../../../../common/endpoint/types';
import { isEndpointHostIsolated } from './is_endpoint_host_isolated';

describe('When using isEndpointHostIsolated()', () => {
  const generator = new EndpointDocGenerator();

  const generateMetadataDoc = (isolation: boolean = true) => {
    const metadataDoc = generator.generateHostMetadata() as HostMetadata;
    return {
      ...metadataDoc,
      Endpoint: {
        ...metadataDoc.Endpoint,
        state: {
          ...metadataDoc.Endpoint.state,
          isolation,
        },
      },
    };
  };

  it('Returns `true` when endpoint is isolated', () => {
    expect(isEndpointHostIsolated(generateMetadataDoc())).toBe(true);
  });

  it('Returns `false` when endpoint is isolated', () => {
    expect(isEndpointHostIsolated(generateMetadataDoc(false))).toBe(false);
  });
});
