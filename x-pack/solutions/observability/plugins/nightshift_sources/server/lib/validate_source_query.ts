/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { validateSourceQuery as validate } from '@kbn/nightshift-shared';

export const validateSourceQuery = (esql: string): void => {
  const error = validate(esql);
  if (error) {
    throw badRequest(error);
  }
};
