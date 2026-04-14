/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Processor {
  add_fields?: {
    target: string;
    fields: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export function createWiredStreamsRoutingProcessor(): Processor {
  return {
    add_fields: {
      target: '@metadata',
      fields: {
        raw_index: 'logs.ecs',
      },
    },
  };
}
