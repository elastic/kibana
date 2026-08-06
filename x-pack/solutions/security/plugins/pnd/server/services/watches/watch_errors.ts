/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isWatchNotFoundError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'WatchNotFoundError';

export const createWatchNotFoundError = (watchId: string): Error => {
  const error = Object.assign(new Error(`Watch "${watchId}" not found`), { statusCode: 404 });
  error.name = 'WatchNotFoundError';
  return error;
};

export const isWatchDeleteForbiddenError = (error: unknown): error is Error =>
  error instanceof Error && error.name === 'WatchDeleteForbiddenError';

export const createWatchDeleteForbiddenError = (watchId: string): Error => {
  const error = new Error(`Managed watch "${watchId}" cannot be deleted from PND`);
  error.name = 'WatchDeleteForbiddenError';
  return error;
};
