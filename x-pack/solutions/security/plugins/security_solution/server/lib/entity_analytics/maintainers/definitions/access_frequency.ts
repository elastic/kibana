/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { get } from 'lodash';
import {
  EntityType,
  EntityTypeToIdentifierField,
} from '../../../../../common/entity_analytics/types';
import { DEFAULT_LOOKBACK_WINDOW, DEFAULT_TIME_FIELD, type EntityMaintainer } from '../maintainer';

const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;

const isSeconds = (duration: string) => {
  return SECONDS_REGEX.test(duration);
};

const isMinutes = (duration: string) => {
  return MINUTES_REGEX.test(duration);
};

const isHours = (duration: string) => {
  return HOURS_REGEX.test(duration);
};

const isDays = (duration: string) => {
  return DAYS_REGEX.test(duration);
};

const parseDuration = (duration: string): number => {
  const parsed = parseInt(duration, 10);
  if (isSeconds(duration)) {
    return parsed * 1000;
  } else if (isMinutes(duration)) {
    return parsed * 60 * 1000;
  } else if (isHours(duration)) {
    return parsed * 60 * 60 * 1000;
  } else if (isDays(duration)) {
    return parsed * 24 * 60 * 60 * 1000;
  }
  throw new Error(
    `Invalid duration "${duration}". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d"`
  );
};

const esqlQueries = {
  // should be defined for each supported entity type
  [EntityType.user]: {
    getRelatedField: () => 'related.host',
    getAccessFrequentlyField: () => `accesses_frequently`,
    getAccessInfrequentlyField: () => `accesses_infrequently`,
    getGroupByFields: (identifierField: string) => `${identifierField}, related.host`,
  },
  [EntityType.host]: {
    getRelatedField: () => 'related.user',
    getAccessFrequentlyField: () => `accessed_frequently_by`,
    getAccessInfrequentlyField: () => `accessed_infrequently_by`,
    getGroupByFields: (identifierField: string) => `${identifierField}, related.user`,
  },
};

export const AccessFrequencyEntityMaintainer: EntityMaintainer = {
  id: '.access_frequency',
  entityTypes: [EntityType.user, EntityType.host],
  getCompositeQuery: (
    timeField: string = DEFAULT_TIME_FIELD,
    lookbackInterval: string = DEFAULT_LOOKBACK_WINDOW
  ) => ({
    bool: {
      filter: [
        { range: { [timeField]: { lt: 'now', gte: `now-${lookbackInterval}` } } },
        { term: { 'event.category': 'authentication' } },
      ],
    },
  }),
  getQuery: (
    index: string,
    entityType: EntityType,
    rangeClause: string,
    lookbackInterval: string = DEFAULT_LOOKBACK_WINDOW
  ) => {
    const identifierField = EntityTypeToIdentifierField[entityType];
    const esqlQueriesEntry = get(esqlQueries, entityType);
    if (!esqlQueriesEntry) {
      throw new Error(`Unsupported entity type for Access Frequency maintainer: ${entityType}`);
    }
    const groupByFields = esqlQueriesEntry.getGroupByFields(identifierField);
    const accessFrequentlyField = esqlQueriesEntry.getAccessFrequentlyField();
    const accessInfrequentlyField = esqlQueriesEntry.getAccessInfrequentlyField();
    const relatedField = esqlQueriesEntry.getRelatedField();

    // threshold
    const now = Date.now();
    const durationInMillis = parseDuration(lookbackInterval);
    const numWeeks = moment(now).diff(
      moment(now).subtract(durationInMillis, 'milliseconds'),
      'week'
    );

    if (numWeeks < 1) {
      throw new Error(
        `Lookback interval "${lookbackInterval}" is too short for Access Frequency maintainer. Must be at least 1 week.`
      );
    }

    return `FROM ${index}
      | WHERE event.category == "authentication"
          AND KQL("${rangeClause}")
      | STATS access_count = COUNT(*) BY ${groupByFields}
      | EVAL access_type = CASE(access_count < ${
        numWeeks + 1
      }, "${accessInfrequentlyField}", access_count >= ${
      numWeeks + 1
    }, "${accessFrequentlyField}", ELSE "unknown")
      | STATS users = TOP(${relatedField}, 10000) BY access_type,${identifierField}
      | STATS ${accessFrequentlyField} = VALUES(users) WHERE access_type == "${accessFrequentlyField}", ${accessInfrequentlyField} = VALUES(users) WHERE access_type == "${accessInfrequentlyField}" BY ${identifierField}
      | LIMIT 3500
`;
  },
  formatRecord: (record: Record<string, unknown>) => {
    if (!record.id) {
      throw new Error('Record is missing id field');
    }
    const { id, ...recordWithoutId } = record;
    return {
      id,
      relationships: recordWithoutId ?? {},
    };
  },
};
