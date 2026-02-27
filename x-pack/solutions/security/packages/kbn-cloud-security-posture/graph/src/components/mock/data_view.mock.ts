/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';

export const mockDataView = {
  id: '1235',
  title: 'test-*',
  fields: [
    {
      name: 'actor.entity.id',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'target.entity.id',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'related.entity',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'event.action',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
  getName: () => 'test-*',
} as DataView;
