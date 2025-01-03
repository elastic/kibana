/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';

export const mockIndexPattern: DataViewBase = {
  fields: [
    {
      name: '@timestamp',
      type: 'date',
    },
    {
      name: '@version',
      type: 'string',
    },
    {
      name: 'agent.ephemeral_id',
      type: 'string',
    },
    {
      name: 'agent.hostname',
      type: 'string',
    },
    {
      name: 'agent.id',
      type: 'string',
    },
    {
      name: 'agent.test1',
      type: 'string',
    },
    {
      name: 'agent.test2',
      type: 'string',
    },
    {
      name: 'agent.test3',
      type: 'string',
    },
    {
      name: 'agent.test4',
      type: 'string',
    },
    {
      name: 'agent.test5',
      type: 'string',
    },
    {
      name: 'agent.test6',
      type: 'string',
    },
    {
      name: 'agent.test7',
      type: 'string',
    },
    {
      name: 'agent.test8',
      type: 'string',
    },
    {
      name: 'host.name',
      type: 'string',
    },
    {
      name: 'nestedField.firstAttributes',
      type: 'string',
    },
    {
      name: 'nestedField.secondAttributes',
      type: 'string',
    },
  ],
  title: 'filebeat-*,auditbeat-*,packetbeat-*',
};

export const mockIndexNames = ['filebeat-*', 'auditbeat-*', 'packetbeat-*'];
