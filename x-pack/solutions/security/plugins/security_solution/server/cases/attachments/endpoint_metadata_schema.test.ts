/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEndpointAttachmentMetadata } from './endpoint_metadata_schema';

describe('validateEndpointAttachmentMetadata', () => {
  const validMetadata = {
    command: 'isolate',
    comment: 'Test comment',
    targets: [
      {
        endpointId: 'endpoint-1',
        hostname: 'host-1',
        agentType: 'endpoint',
      },
    ],
  };

  it('does not throw for valid metadata', () => {
    expect(() => validateEndpointAttachmentMetadata(validMetadata)).not.toThrow();
  });

  it('does not throw for valid metadata with multiple targets', () => {
    expect(() =>
      validateEndpointAttachmentMetadata({
        ...validMetadata,
        targets: [
          { endpointId: '1', hostname: 'host-1', agentType: 'endpoint' },
          { endpointId: '2', hostname: 'host-2', agentType: 'sentinel_one' },
          { endpointId: '3', hostname: 'host-3', agentType: 'microsoft_defender_endpoint' },
          { endpointId: '4', hostname: 'host-4', agentType: 'crowdstrike' },
        ],
      })
    ).not.toThrow();
  });

  it('throws for missing command', () => {
    expect(() =>
      validateEndpointAttachmentMetadata({ comment: 'test', targets: validMetadata.targets })
    ).toThrow('Invalid endpoint attachment metadata');
  });

  it('throws for missing comment', () => {
    expect(() =>
      validateEndpointAttachmentMetadata({ command: 'isolate', targets: validMetadata.targets })
    ).toThrow('Invalid endpoint attachment metadata');
  });

  it('throws for missing targets', () => {
    expect(() =>
      validateEndpointAttachmentMetadata({ command: 'isolate', comment: 'test' })
    ).toThrow('Invalid endpoint attachment metadata');
  });

  it('throws for empty targets array', () => {
    expect(() => validateEndpointAttachmentMetadata({ ...validMetadata, targets: [] })).toThrow(
      'targets must contain at least one entry'
    );
  });

  it('throws for targets with missing fields', () => {
    expect(() =>
      validateEndpointAttachmentMetadata({
        ...validMetadata,
        targets: [{ endpointId: '1' }],
      })
    ).toThrow('Invalid endpoint attachment metadata');
  });

  it('throws for targets with an unknown agentType', () => {
    expect(() =>
      validateEndpointAttachmentMetadata({
        ...validMetadata,
        targets: [{ endpointId: '1', hostname: 'host-1', agentType: 'not-a-real-agent' }],
      })
    ).toThrow('Invalid endpoint attachment metadata');
  });

  it('throws for unknown top-level keys', () => {
    expect(() => validateEndpointAttachmentMetadata({ ...validMetadata, extra: 'nope' })).toThrow(
      'unknown key(s) [extra]'
    );
  });

  it('throws for null input', () => {
    expect(() => validateEndpointAttachmentMetadata(null)).toThrow(
      'Invalid endpoint attachment metadata'
    );
  });

  it('throws for non-object input', () => {
    expect(() => validateEndpointAttachmentMetadata('string')).toThrow(
      'Invalid endpoint attachment metadata'
    );
  });
});
