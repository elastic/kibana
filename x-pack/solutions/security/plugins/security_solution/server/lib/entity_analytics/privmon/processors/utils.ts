/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserAndObservations } from './types';

export const mergeObservationsByUser = (
  userAndObservations: UserAndObservations[]
): UserAndObservations[] => {
  const groupedObservations: Map<UserAndObservations['user'], UserAndObservations[]> = new Map();

  for (const userAndObservation of userAndObservations) {
    if (!groupedObservations.has(userAndObservation.user)) {
      groupedObservations.set(userAndObservation.user, []);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We just set it above
    groupedObservations.get(userAndObservation.user)!.push(userAndObservation);
  }

  return Array.from(groupedObservations.values()).map((observations) => {
    return {
      user: observations[0].user,
      observations: observations.flatMap(
        (observation: UserAndObservations) => observation.observations
      ),
    };
  });
};
