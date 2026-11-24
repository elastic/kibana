/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** An error rate (errors per session or page load) with two decimals, as the lists show it. */
export const formatErrorRate = (rate: number): string => rate.toFixed(2);
