/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true if there are integrations that are referenced by detection rules
 * but not installed in the environment.
 */
export const hasMissingIntegrations = (missingIntegrations: string[] | undefined): boolean => {
  return Boolean(missingIntegrations?.length);
};
