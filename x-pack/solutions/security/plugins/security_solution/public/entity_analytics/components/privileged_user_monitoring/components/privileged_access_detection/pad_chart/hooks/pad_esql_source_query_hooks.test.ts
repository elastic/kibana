/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  usePadTopAnomalousUsersEsqlSource,
  usePadAnomalyDataEsqlSource,
} from './pad_esql_source_query_hooks';

const trimEsql = (str: string) => str.replace(/[\n]/g, '').replace(/\s\s+/g, ' ').trim();

jest.mock('./pad_heatmap_interval_hooks', () => ({
  useIntervalForHeatmap: () => 24,
}));

describe('the source queries for privileged access detection', () => {
  describe('the top anomalous users ESQL query', () => {
    it('includes all of the jobs passed in, and respects the provided usersLimit', () => {
      const query = usePadTopAnomalousUsersEsqlSource({
        jobIds: ['jobOne', 'jobTwo'],
        anomalyBands: [],
        spaceId: 'default',
        usersLimit: 100,
      });

      expect(trimEsql(query)).toEqual(
        trimEsql(`
          FROM .ml-anomalies-shared
            | WHERE job_id IN ("jobOne", "jobTwo")
            | WHERE record_score IS NOT NULL AND user.name IS NOT NULL
            | RENAME @timestamp AS event_timestamp
            | LOOKUP JOIN .entity_analytics.monitoring.users-default ON user.name
            | RENAME event_timestamp AS @timestamp
            | WHERE user.is_privileged == true
            | STATS max_record_score = MAX(record_score), user.is_privileged = TOP(user.is_privileged, 1, "desc") by user.name
            | WHERE user.is_privileged == true
            | SORT max_record_score DESC
            | KEEP user.name
            | LIMIT 100
      `)
      );
    });

    it('has only the hidden anomaly bands', () => {
      const query = usePadTopAnomalousUsersEsqlSource({
        jobIds: ['job'],
        anomalyBands: [
          {
            start: 0,
            end: 25,
            color: '#ffffff',
            hidden: true,
          },
          {
            start: 25,
            end: 50,
            color: '#ffffff',
            hidden: true,
          },
          {
            start: 50,
            end: 75,
            color: '#ffffff',
            hidden: false,
          },
        ],
        spaceId: 'default',
        usersLimit: 100,
      });

      expect(trimEsql(query)).toEqual(
        trimEsql(`
          FROM .ml-anomalies-shared
            | WHERE job_id IN ("job")
            | WHERE record_score IS NOT NULL AND user.name IS NOT NULL
            | WHERE record_score < 0 OR record_score >= 25
            | WHERE record_score < 25 OR record_score >= 50
            | RENAME @timestamp AS event_timestamp
            | LOOKUP JOIN .entity_analytics.monitoring.users-default ON user.name
            | RENAME event_timestamp AS @timestamp
            | WHERE user.is_privileged == true
            | STATS max_record_score = MAX(record_score), user.is_privileged = TOP(user.is_privileged, 1, "desc") by user.name
            | WHERE user.is_privileged == true
            | SORT max_record_score DESC
            | KEEP user.name
            | LIMIT 100
      `)
      );
    });
  });
  describe('the anomalies query', () => {
    it('has the provided jobs and usernames, and uses the 24h interval coming from the heatmap interval', () => {
      const query = usePadAnomalyDataEsqlSource({
        jobIds: ['jobOne', 'jobTwo'],
        anomalyBands: [],
        spaceId: 'default',
        userNames: ['cloud', 'squall', 'zidane'],
      });
      expect(trimEsql(query ?? fail('Query must not be undefined'))).toEqual(
        trimEsql(`
          FROM .ml-anomalies-shared
            | WHERE job_id IN ("jobOne", "jobTwo")
            | WHERE record_score IS NOT NULL AND user.name IS NOT NULL AND user.name IN ("cloud", "squall", "zidane")
            | RENAME @timestamp AS event_timestamp
            | LOOKUP JOIN .entity_analytics.monitoring.users-default ON user.name
            | RENAME event_timestamp AS @timestamp
            | WHERE user.is_privileged == true
            | EVAL user_name_to_record_score = CONCAT(user.name, " : ", TO_STRING(record_score))
            | STATS user_name_to_record_score = VALUES(user_name_to_record_score) BY @timestamp = BUCKET(@timestamp, 24h)
            | MV_EXPAND user_name_to_record_score
            | DISSECT user_name_to_record_score """%{user.name} : %{record_score}"""
            | EVAL record_score = TO_DOUBLE(record_score)
            | KEEP @timestamp, user.name, record_score
            | STATS record_score = MAX(record_score) BY @timestamp, user.name
            | SORT record_score DESC
      `)
      );
    });
    it('has only the hidden anomaly bands', () => {
      const query = usePadAnomalyDataEsqlSource({
        jobIds: ['job'],
        anomalyBands: [
          {
            start: 0,
            end: 25,
            color: '#ffffff',
            hidden: true,
          },
          {
            start: 25,
            end: 50,
            color: '#ffffff',
            hidden: true,
          },
          {
            start: 50,
            end: 75,
            color: '#ffffff',
            hidden: false,
          },
        ],
        spaceId: 'default',
        userNames: ['ramza'],
      });
      expect(trimEsql(query ?? fail('Query must not be undefined'))).toEqual(
        trimEsql(`
          FROM .ml-anomalies-shared
            | WHERE job_id IN ("job")
            | WHERE record_score IS NOT NULL AND user.name IS NOT NULL AND user.name IN ("ramza")
            | WHERE record_score < 0 OR record_score >= 25
            | WHERE record_score < 25 OR record_score >= 50
            | RENAME @timestamp AS event_timestamp
            | LOOKUP JOIN .entity_analytics.monitoring.users-default ON user.name
            | RENAME event_timestamp AS @timestamp
            | WHERE user.is_privileged == true
            | EVAL user_name_to_record_score = CONCAT(user.name, " : ", TO_STRING(record_score))
            | STATS user_name_to_record_score = VALUES(user_name_to_record_score) BY @timestamp = BUCKET(@timestamp, 24h)
            | MV_EXPAND user_name_to_record_score
            | DISSECT user_name_to_record_score """%{user.name} : %{record_score}"""
            | EVAL record_score = TO_DOUBLE(record_score)
            | KEEP @timestamp, user.name, record_score
            | STATS record_score = MAX(record_score) BY @timestamp, user.name
            | SORT record_score DESC
      `)
      );
    });
  });
});
