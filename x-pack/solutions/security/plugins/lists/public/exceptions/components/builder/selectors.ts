/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { State } from './reducer';

export const getTotalErrorExist = (state: State): number => {
  const { exceptions, errors } = state;
  const allEntryIds = exceptions
    .map((exception) => exception.entries.map((entry) => entry.id))
    .flat();
  const errTotal = Object.keys(errors).filter(
    (id) => allEntryIds.includes(id) && errors[id]
  ).length;
  return errTotal;
};
