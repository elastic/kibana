/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unflattenMetadataInfoFields } from './unflatten_metadata_info_fileds';

describe('unflattenMetadataInfoFields', () => {
  it('should map fields with single values correctly', () => {
    const fields = {
      'host.name': ['host-1'],
      'host.os.name': ['Linux'],
      'agent.name': ['agent-1'],
      'agent.version': ['8.0.0'],
      'container.runtime': ['docker'],
      'host.os.type': ['linux'],
    };

    const result: Record<string, any> = {};
    unflattenMetadataInfoFields(result, { fields });

    expect(result).toEqual({
      host: {
        name: 'host-1',
        os: {
          name: 'Linux',
          type: 'linux',
        },
      },
      agent: {
        name: 'agent-1',
        version: '8.0.0',
      },
      container: {
        runtime: 'docker',
      },
    });
  });

  it('should map fields with multiple values as arrays', () => {
    const fields = {
      'host.name': ['host-1'],
      'host.mac': ['36-5D-68-05-71-00', '16-40-2D-D3-28-73', '3E-DD-4B-37-4C-C2'],
    };

    const result: Record<string, any> = {};
    unflattenMetadataInfoFields(result, { fields });

    expect(result).toEqual({
      host: {
        name: 'host-1',
        mac: ['36-5D-68-05-71-00', '16-40-2D-D3-28-73', '3E-DD-4B-37-4C-C2'],
      },
    });
  });

  it('should ignore null or undefined values', () => {
    const fields = {
      'host.name': ['host-1'],
      'host.os.name': null,
      'host.os.version': undefined,
    };

    const result: Record<string, any> = {};
    unflattenMetadataInfoFields(result, { fields });

    expect(result).toEqual({
      host: {
        name: 'host-1',
      },
    });
  });

  it('should handle empty fields object', () => {
    const fields = {};

    const result: Record<string, any> = {};
    unflattenMetadataInfoFields(result, { fields });

    expect(result).toEqual({});
  });

  it('should handle fields with arrays of length 1 as single values', () => {
    const fields = {
      'host.name': ['host-1'],
      'host.os.name': ['Linux'],
    };

    const result: Record<string, any> = {};
    unflattenMetadataInfoFields(result, { fields });

    expect(result).toEqual({
      host: {
        name: 'host-1',
        os: {
          name: 'Linux',
        },
      },
    });
  });
});
