/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isEmpty } from 'lodash/fp';
import { set } from '@kbn/safer-lodash-set/fp';
import { sourceFieldsMap, hostFieldsMap } from '@kbn/securitysolution-ecs';
import { toObjectArrayOfStrings } from '@kbn/timelines-plugin/common';
import type {
  AuthenticationsEdges,
  AuthenticationHit,
  AuthenticationBucket,
  FactoryQueryTypes,
  StrategyResponseType,
} from '../../../../../../common/search_strategy/security_solution';

export const authenticationsFields = ['timestamp', 'source.ip', 'host.id', 'host.name'];
export const authenticationsFieldsMap: Readonly<Record<string, unknown>> = {
  latest: '@timestamp',
  lastSuccess: {
    timestamp: '@timestamp',
    ...sourceFieldsMap,
    ...hostFieldsMap,
  },
  lastFailure: {
    timestamp: '@timestamp',
    ...sourceFieldsMap,
    ...hostFieldsMap,
  },
};

export const formatAuthenticationData = (hit: AuthenticationHit): AuthenticationsEdges => {
  let flattenedFields = {
    node: {
      _id: hit._id,
      stackedValue: [hit.stackedValue],
      failures: hit.failures,
      successes: hit.successes,
    },
    cursor: {
      value: hit.cursor,
      tiebreaker: null,
    },
  };

  const lastSuccessFields = getAuthenticationFields(authenticationsFields, hit, 'lastSuccess');
  if (Object.keys(lastSuccessFields).length > 0) {
    flattenedFields = set('node.lastSuccess', lastSuccessFields, flattenedFields);
  }

  const lastFailureFields = getAuthenticationFields(authenticationsFields, hit, 'lastFailure');
  if (Object.keys(lastFailureFields).length > 0) {
    flattenedFields = set('node.lastFailure', lastFailureFields, flattenedFields);
  }

  return flattenedFields;
};

const getAuthenticationFields = (fields: string[], hit: AuthenticationHit, parentField: string) => {
  return fields.reduce((flattenedFields, fieldName) => {
    const fieldPath = `${fieldName}`;
    const esField = get(`${parentField}['${fieldName}']`, authenticationsFieldsMap);

    if (!isEmpty(esField)) {
      const fieldValue = get(`${parentField}['${esField}']`, hit.fields);
      if (!isEmpty(fieldValue)) {
        return set(
          fieldPath,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str),
          flattenedFields
        );
      }
    }

    return flattenedFields;
  }, {});
};

export const getHits = <T extends FactoryQueryTypes>(response: StrategyResponseType<T>) =>
  getOr([], 'aggregations.stack_by.buckets', response.rawResponse).map(
    (bucket: AuthenticationBucket) => ({
      _id: getOr(
        `${bucket.key}+${bucket.doc_count}`,
        'failures.lastFailure.hits.hits[0]._id',
        bucket
      ),
      fields: {
        lastSuccess: getOr(null, 'successes.lastSuccess.hits.hits[0].fields', bucket),
        lastFailure: getOr(null, 'failures.lastFailure.hits.hits[0].fields', bucket),
      },
      stackedValue: bucket.key,
      failures: bucket.failures.doc_count,
      successes: bucket.successes.doc_count,
    })
  );
