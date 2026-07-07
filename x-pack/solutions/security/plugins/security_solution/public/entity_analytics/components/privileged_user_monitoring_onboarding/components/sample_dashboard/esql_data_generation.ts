/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import { map, right } from 'fp-ts/Either';
import { CURRENT_TIME, GRANTED_RIGHTS_DATA, PAGE_SIZE } from './constants';
import type { UserRowData } from './types';
import type { EsqlQueryOrInvalidFields } from '../../../privileged_user_monitoring/queries/helpers';

export const getToTime = () => CURRENT_TIME.clone().set({ minute: 0, second: 0, millisecond: 0 }); // Start of the current hour
export const getFromTime = () => getToTime().subtract(1, 'day'); // 24 hours ago
export const getBucketTimeRange = () => ({
  from: getFromTime().toISOString(),
  to: getToTime().subtract(1, 'hour').toISOString(), // We shouldn't include the current hour. Since it is the top boundary, no dates will be in this bucket.
});

const generateRandomDate = (from: Moment, to: Moment) => {
  // Generate a date between the two given moment js dates
  const randomDate = from
    .clone()
    .add(Math.random() * (to.valueOf() - from.valueOf()), 'milliseconds');
  return randomDate.toISOString();
};

const generateUserRowData = ({ quantity, user, target, right: userPrivilege, ip }: UserRowData) => {
  const userRowData = [];
  for (let i = 0; i < quantity; i++) {
    userRowData.push(
      `"${user},${target},${userPrivilege},${ip},${generateRandomDate(getFromTime(), getToTime())}"`
    );
  }
  return userRowData.join(',');
};

export const generateESQLSource = () => {
  const rows = GRANTED_RIGHTS_DATA.map((row) => generateUserRowData(row)).join(',');
  return right(`ROW data=[${rows}]
            | MV_EXPAND data
            | EVAL row = SPLIT(data, ",")
            | EVAL privileged_user = MV_SLICE(row, 0), target_user = MV_SLICE(row, 1), right = MV_SLICE(row, 2), ip = MV_SLICE(row, 3), @timestamp = TO_DATETIME(MV_SLICE(row, 4))
            | DROP row`);
};

export const generateListESQLQuery =
  (esqlSource: EsqlQueryOrInvalidFields) =>
  (sortField: string | number | symbol, sortDirection: string, currentPage: number) => {
    return map<string, string>(
      (src) => `${src}
        | SORT ${String(sortField)} ${sortDirection}
        | LIMIT ${1 + currentPage * PAGE_SIZE}`
    )(esqlSource);
  };

export const generateVisualizationESQLQuery =
  (esqlSource: EsqlQueryOrInvalidFields) =>
  (stackByField: string, timerange: { from: string; to: string }) =>
    map<string, string>(
      (src) => `${src}
        | STATS results = COUNT(*) by timestamp = BUCKET(@timestamp, 30, "${timerange.from}", "${timerange.to}"), ${stackByField}`
    )(esqlSource);
