/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDefaultRefinePrompt =
  (): string => `You previously generated the following insights, but sometimes they include events that aren't from an antivirus program or are not grouped correctly by the same antivirus program.

Review the insights below and remove any that are not from an antivirus program and combine duplicates into the same 'group'; leave any other insights unchanged:`;
