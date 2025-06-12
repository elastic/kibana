/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Type utility to force typescript to early evaluate the type.
 * This is useful for clarifying type computations
 */
export type Expand<T> = T extends unknown ? { [K in keyof T]: T[K] } : never;
