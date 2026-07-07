/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const getApproximateFutureTime = ({
  averageSuccessfulDurationNanoseconds,
  generationStartTime,
}: {
  averageSuccessfulDurationNanoseconds: number | undefined;
  generationStartTime: string;
}): Date | null => {
  try {
    if (averageSuccessfulDurationNanoseconds == null) {
      return null;
    }

    const averageSuccessfulDurationSeconds = Math.ceil(
      averageSuccessfulDurationNanoseconds / 1_000_000_000
    );

    return moment(generationStartTime).add(averageSuccessfulDurationSeconds, 'seconds').toDate();
  } catch {
    return null;
  }
};
