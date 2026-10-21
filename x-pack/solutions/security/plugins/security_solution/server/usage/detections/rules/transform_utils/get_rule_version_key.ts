/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds a lookup key that uniquely identifies a specific version of a prebuilt rule.
 */
export const getRuleVersionKey = (ruleId: string, version: number): string =>
  `${ruleId}:${version}`;
