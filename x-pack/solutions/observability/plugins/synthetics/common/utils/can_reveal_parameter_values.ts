/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Parameter values are only revealed to users who can both save monitors and read parameter values. */
export const canRevealParameterValues = (uptimeCapabilities?: Readonly<Record<string, unknown>>) =>
  Boolean(uptimeCapabilities?.save) && Boolean(uptimeCapabilities?.canReadParamValues);
