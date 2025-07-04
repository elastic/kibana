/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set/fp';
import { get, has } from 'lodash/fp';
import type {
  ServiceAggEsItem,
  ServiceBuckets,
  ServiceItem,
} from '../../../../../../common/search_strategy/security_solution/services/common';

export const SERVICE_FIELDS = [
  'service.id',
  'service.name',
  'service.address',
  'service.environment',
  'service.ephemeral_id',
  'service.node.name',
  'service.node.roles',
  'service.node.role',
  'service.state',
  'service.type',
  'service.version',
];

export const fieldNameToAggField = (fieldName: string) => fieldName.replace(/\./g, '_');

export const formatServiceItem = (aggregations: ServiceAggEsItem): ServiceItem => {
  return SERVICE_FIELDS.reduce<ServiceItem>((flattenedFields, fieldName) => {
    const aggField = fieldNameToAggField(fieldName);

    if (has(aggField, aggregations)) {
      const data: ServiceBuckets = get(aggField, aggregations);
      const fieldValue = data.buckets.map((obj) => obj.key);

      return set(fieldName, fieldValue, flattenedFields);
    }
    return flattenedFields;
  }, {});
};
