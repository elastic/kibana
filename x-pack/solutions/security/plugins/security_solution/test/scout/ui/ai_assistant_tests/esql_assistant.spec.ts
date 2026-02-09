/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect } from './fixtures';

// Failing in Cypress: See https://github.com/elastic/kibana/issues/180756
// This test requires a preconfigured OpenAI connector and auditbeat data.
// It also uses custom kbnServerArgs which need Scout server config support.
// TODO: Enable after configuring preconfigured connectors in Scout server config.
test.describe.skip('ES|QL Assistant', { tag: ['@ess'] }, () => {
  test.describe('ES|QL', () => {
    test('should properly propagate esql query to discover', async () => {
      // Placeholder - requires preconfigured connector
    });
  });

  test.describe('KQL', () => {
    test('should properly propagate KQL query', async () => {
      // Placeholder
    });
  });

  test.describe('EQL', () => {
    test('should properly propagate EQL query', async () => {
      // Placeholder
    });
  });
});
