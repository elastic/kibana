/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesFindResponse } from '@kbn/cases-plugin/common/types/api';
import type { TestCase } from '../../objects/case';
import { rootRequest } from './common';

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

export const getCases = () =>
  rootRequest<CasesFindResponse>({
    method: 'GET',
    url: 'api/cases/_find',
  });

export const deleteCases = () => {
  getCases().then(($response) => {
    if ($response.body.cases.length > 0) {
      const ids = $response.body.cases.map((myCase) => {
        return `"${myCase.id}"`;
      });
      rootRequest({
        method: 'DELETE',
        url: `/api/cases?ids=[${ids}]`,
      });
    }
  });
};
