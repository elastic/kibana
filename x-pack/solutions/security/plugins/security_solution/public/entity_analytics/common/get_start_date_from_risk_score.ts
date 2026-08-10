/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dateMath from '@kbn/datemath';
import moment from 'moment';

/** Moment constructor that parses/builds in UTC, while keeping datemath-required statics like `isMoment`. */
const utcMomentInstance: typeof moment = Object.assign(
  (input?: moment.MomentInput) => (input === undefined ? moment.utc() : moment.utc(input)),
  moment
);

/**
 * return start date of risk scoring by calculating the difference between risk score timestamp and risk range start date
 * return the same risk range start date if it's a date
 * return now-30d if there are erros in parsing the date
 */
export const getStartDateFromRiskScore = ({
  riskRangeStart,
  riskScoreTimestamp,
}: {
  riskRangeStart: string;
  riskScoreTimestamp: string;
}): string => {
  try {
    if (moment(riskRangeStart).isValid()) {
      return riskRangeStart;
    }
    // Use UTC for datemath + diffs so relative units (e.g. now-30d) are not skewed by local DST.
    const startDateFromNow = dateMath.parse(riskRangeStart, { momentInstance: utcMomentInstance });
    if (!startDateFromNow || !startDateFromNow.isValid()) {
      throw new Error('error parsing risk range start date');
    }
    const now = moment.utc();
    const rangeInHours = now.diff(startDateFromNow, 'minutes');

    const riskScoreDate = dateMath.parse(riskScoreTimestamp, { momentInstance: utcMomentInstance });
    if (!riskScoreDate || !riskScoreDate.isValid()) {
      throw new Error('error parsing risk score timestamp');
    }

    const startDate = riskScoreDate.subtract(rangeInHours, 'minutes');

    return startDate.utc().toISOString();
  } catch (error) {
    return 'now-30d';
  }
};
