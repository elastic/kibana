/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWiredStreamsRoutingProcessor } from './inject_wired_streams_routing';

describe('createWiredStreamsRoutingProcessor', () => {
  it('should create an add_fields processor targeting @metadata.raw_index', () => {
    const processor = createWiredStreamsRoutingProcessor();

    expect(processor).toEqual({
      add_fields: {
        target: '@metadata',
        fields: {
          raw_index: 'logs.ecs',
        },
      },
    });
  });

  it('should return a new object each time', () => {
    const processor1 = createWiredStreamsRoutingProcessor();
    const processor2 = createWiredStreamsRoutingProcessor();

    expect(processor1).not.toBe(processor2);
    expect(processor1).toEqual(processor2);
  });
});
