/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Given an array of objects (assuming rules) this will return a ndjson buffer which is useful
 * for testing uploads.
 * @param rules Array of rules
 */
export const getRulesAsNdjson = (rules: unknown[]): Buffer => {
  const stringOfRules = rules.map((rule) => {
    return JSON.stringify(rule);
  });
  return Buffer.from(stringOfRules.join('\n'));
};
