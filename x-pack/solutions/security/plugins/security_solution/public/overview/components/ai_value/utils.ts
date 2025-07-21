/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';

export const getTimeRangeAsDays = ({ from, to }: { from: string; to: string }): string => {
  const duration = moment.duration(moment(to).diff(moment(from)));
  const days = duration.asDays();
  return `${Math.round(days)}`;
};
