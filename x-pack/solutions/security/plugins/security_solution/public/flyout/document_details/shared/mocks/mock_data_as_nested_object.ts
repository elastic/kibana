/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

/**
 * Mock an object of nested properties for an alert
 */
export const mockDataAsNestedObject: Ecs = {
  _id: 'testId',
  timestamp: '2023-01-01T01:01:01.000Z',
  agent: {
    type: ['endpoint'],
  },
  event: {
    category: ['malware'],
    kind: ['signal'],
  },
  host: {
    name: ['host-name'],
  },
  kibana: {
    alert: {
      rule: {
        name: ['rule-name'],
        parameters: {},
        uuid: [],
      },
      severity: ['low'],
    },
  },
  process: {
    name: ['process-name'],
    entity_id: ['process-entity_id'],
  },
};
