/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HIGH_CONFIDENCE_THRESHOLD = 70;
const MEDIUM_CONFIDENCE_THRESHOLD = 40;

export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return 'success';
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return 'warning';
  return 'danger';
};
