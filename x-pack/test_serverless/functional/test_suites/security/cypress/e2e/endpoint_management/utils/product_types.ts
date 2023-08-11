/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionDescribeBlockFtrConfig } from '@kbn/security-solution-plugin/scripts/run_cypress/utils';

type FtrConfigProductTypes = SecuritySolutionDescribeBlockFtrConfig['productTypes'];

export const SECURITY_ESSENTIALS_NO_ENDPOINT: FtrConfigProductTypes = Object.freeze([
  { product_line: 'security', product_tier: 'essentials' },
]) as FtrConfigProductTypes;

export const SECURITY_COMPLETE_NO_ENDPOINT: FtrConfigProductTypes = Object.freeze([
  { product_line: 'security', product_tier: 'complete' },
]) as FtrConfigProductTypes;

export const SECURITY_ESSENTIALS_WITH_ENDPOINT_ESSENTIALS: FtrConfigProductTypes = Object.freeze([
  { product_line: 'security', product_tier: 'essentials' },
  { product_line: 'endpoint', product_tier: 'essentials' },
]) as FtrConfigProductTypes;

export const SECURITY_COMPLETE_WITH_ENDPOINT_COMPLETE: FtrConfigProductTypes = Object.freeze([
  { product_line: 'security', product_tier: 'complete' },
  { product_line: 'endpoint', product_tier: 'complete' },
]) as FtrConfigProductTypes;
