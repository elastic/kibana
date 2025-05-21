/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const BARCHART_NUMBER_OF_COLUMNS = 16;

/**
 * Calculates the time interval in ms for a specific number of columns
 * @param dateFrom Min (older) date for the barchart
 * @param dateTo Max (newer) date for the barchart
 * @param numberOfColumns Desired number of columns (defaulted to {@link BARCHART_NUMBER_OF_COLUMNS})
 * @returns The interval in ms for a column (for example '100000ms')
 */
export const calculateBarchartColumnTimeInterval = (
  dateFrom: number | moment.Moment,
  dateTo: number | moment.Moment,
  numberOfColumns = BARCHART_NUMBER_OF_COLUMNS
): string => {
  const from: number = moment.isMoment(dateFrom) ? dateFrom.valueOf() : dateFrom;
  const to: number = moment.isMoment(dateTo) ? dateTo.valueOf() : dateTo;
  return `${Math.floor(moment(to).diff(moment(from)) / numberOfColumns)}ms`;
};
