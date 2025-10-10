/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 *
 * Probes esClient error to see if it is a not found error
 *
 */
export const isNotFoundError = (error: Error) => {
  try {
    const message = JSON.parse(error.message);
    if (Object.hasOwn(message, 'found') && message.found === false) {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
};
