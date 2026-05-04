/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
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

  // Errors thrown from a registered cases-plugin `schemaValidator` callback are
  // surfaced to the HTTP client as-is. `Boom.badRequest` (HTTP 400) is the only
  // shape that turns into a client error — a plain `Error` would bubble up as
  // 500 Internal Server Error and pollute the server logs.
  describe('error shape', () => {
    const expectBoom400 = (input: unknown, partialMessage?: string): void => {
      let captured: unknown;
      try {
        validateEndpointAttachmentMetadata(input);
      } catch (err) {
        captured = err;
      }
      expect(captured).toBeDefined();
      expect(Boom.isBoom(captured as Error)).toBe(true);
      const boomErr = captured as Boom.Boom;
      expect(boomErr.output.statusCode).toBe(400);
      if (partialMessage) {
        expect(boomErr.message).toContain(partialMessage);
      }
    };

    it('throws Boom.badRequest (400) for invalid shape', () => {
      expectBoom400({ command: 'isolate' }, 'Invalid endpoint attachment metadata');
    });

    it('throws Boom.badRequest (400) for empty targets', () => {
      expectBoom400(
        { command: 'isolate', comment: 'c', targets: [] },
        'targets must contain at least one entry'
      );
    });

    it('throws Boom.badRequest (400) for unknown top-level keys', () => {
      expectBoom400(
        {
          command: 'isolate',
          comment: 'c',
          targets: [{ endpointId: '1', hostname: 'h', agentType: 'endpoint' }],
          extra: 'nope',
        },
        'unknown key(s) [extra]'
      );
    });

    it('throws Boom.badRequest (400) for null input', () => {
      expectBoom400(null, 'expected an object');
    });

    it('throws Boom.badRequest (400) for non-object input', () => {
      expectBoom400('string', 'expected an object');
    });
  });
});
