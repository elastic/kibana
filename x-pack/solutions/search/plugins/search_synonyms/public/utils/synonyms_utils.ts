/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isExplicitSynonym = (synonym: string) => {
  return synonym.trim().includes('=>');
};

export const getExplicitSynonym = (synonym: string) => {
  return [synonym.split('=>')[0].trim(), synonym.split('=>')[1].trim()];
};
