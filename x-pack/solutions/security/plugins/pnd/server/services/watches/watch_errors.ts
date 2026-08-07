/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createWatchNotFoundError = (watchId: string): Error => {
  const error = Object.assign(new Error(`Watch "${watchId}" not found`), { statusCode: 404 });
  error.name = 'WatchNotFoundError';
  return error;
};
