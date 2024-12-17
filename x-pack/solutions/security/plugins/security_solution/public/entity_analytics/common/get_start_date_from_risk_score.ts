/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dateMath from '@kbn/datemath';
import moment from 'moment';

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
    const startDateFromNow = dateMath.parse(riskRangeStart);
    if (!startDateFromNow || !startDateFromNow.isValid()) {
      throw new Error('error parsing risk range start date');
    }
    const now = moment();
    const rangeInHours = now.diff(startDateFromNow, 'minutes');

    const riskScoreDate = dateMath.parse(riskScoreTimestamp);
    if (!riskScoreDate || !riskScoreDate.isValid()) {
      throw new Error('error parsing risk score timestamp');
    }

    const startDate = riskScoreDate.subtract(rangeInHours, 'minutes');

    return startDate.utc().toISOString();
  } catch (error) {
    return 'now-30d';
  }
};
