/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import faker from 'faker';
import type { IndexingInterval } from './types';

export const getTimestamp = (interval?: IndexingInterval) => {
  if (interval) {
    return faker.date.between(...interval).toISOString();
  }

  return new Date().toISOString();
};
