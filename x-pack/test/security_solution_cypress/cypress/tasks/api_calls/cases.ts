/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestCase } from '../../objects/case';

export const createCase = (newCase: TestCase) =>
  cy.request({
    method: 'POST',
    url: 'api/cases',
    body: {
      description: newCase.description,
      title: newCase.name,
      tags: ['tag'],
      connector: {
        id: 'none',
        name: 'none',
        type: '.none',
        fields: null,
      },
      settings: {
        syncAlerts: true,
      },
      owner: newCase.owner,
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  });
