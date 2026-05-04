/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true if an index has incompatible ECS field mappings.
 */
export const isQualityIncompatible = (incompatibleFieldCount: number): boolean => {
  return incompatibleFieldCount > 0;
};

/**
 * Returns "incompatible" or "healthy" based on the index's incompatible field count.
 */
export const getQualityStatus = (incompatibleFieldCount: number): 'incompatible' | 'healthy' => {
  return isQualityIncompatible(incompatibleFieldCount) ? 'incompatible' : 'healthy';
};
