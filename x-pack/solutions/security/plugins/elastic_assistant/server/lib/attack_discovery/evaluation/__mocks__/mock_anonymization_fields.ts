/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

export const getMockAnonymizationFieldResponse = (): AnonymizationFieldResponse[] => [
  {
    id: '6UDO45IBoEQSo_rIK1EW',
    timestamp: '2024-10-31T18:19:52.468Z',
    field: '_id',
    allowed: true,
    anonymized: false,
    createdAt: '2024-10-31T18:19:52.468Z',
    namespace: 'default',
  },
  {
    id: '6kDO45IBoEQSo_rIK1EW',
    timestamp: '2024-10-31T18:19:52.468Z',
    field: '@timestamp',
    allowed: true,
    anonymized: false,
    createdAt: '2024-10-31T18:19:52.468Z',
    namespace: 'default',
  },
  {
    id: '60DO45IBoEQSo_rIK1EW',
    timestamp: '2024-10-31T18:19:52.468Z',
    field: 'cloud.availability_zone',
    allowed: true,
    anonymized: false,
    createdAt: '2024-10-31T18:19:52.468Z',
    namespace: 'default',
  },
  {
    id: '_EDO45IBoEQSo_rIK1EW',
    timestamp: '2024-10-31T18:19:52.468Z',
    field: 'host.name',
    allowed: true,
    anonymized: true,
    createdAt: '2024-10-31T18:19:52.468Z',
    namespace: 'default',
  },
  {
    id: 'SkDO45IBoEQSo_rIK1IW',
    timestamp: '2024-10-31T18:19:52.468Z',
    field: 'user.name',
    allowed: true,
    anonymized: true,
    createdAt: '2024-10-31T18:19:52.468Z',
    namespace: 'default',
  },
  {
    id: 'TUDO45IBoEQSo_rIK1IW',
    timestamp: '2024-10-31T18:19:52.468Z',
    field: 'user.target.name',
    allowed: true,
    anonymized: true,
    createdAt: '2024-10-31T18:19:52.468Z',
    namespace: 'default',
  },
];
