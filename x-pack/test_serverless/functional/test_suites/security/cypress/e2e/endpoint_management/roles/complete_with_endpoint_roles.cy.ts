/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FIXME:PT Delete when implemented
export {};

describe(
  'User Roles for Security Complete PLI with Endpoint Complete addon',
  {
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
    // FIXME:PT implement

    describe('for role: t1_analyst', () => {});

    describe('for role: t2_analyst', () => {});

    describe('for role: t3_analyst', () => {});

    describe('for role: threat_intelligence_analyst', () => {});

    describe('for role: rule_author', () => {});

    describe('for role: soc_manager', () => {});

    describe('for role: detections_admin', () => {});

    describe('for role: platform_engineer', () => {});

    describe('for role: endpoint_operations_manager', () => {});
  }
);
