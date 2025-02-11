/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchRunningDefendInsights, fetchWorkflowInsights } from '../../../../tasks/insights';
import { login, ROLE } from '../../../../tasks/login';

// Unskip when defendInsights assistant feature is enabled by default
describe(
  'Workflow Insights APIs',
  {
    tags: ['@serverless', '@skipInServerlessMKI'], // remove @skipInServerlessMKI once changes are merged
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
    beforeEach(() => {
      login(ROLE.system_indices_superuser);
    });
    describe('/workflow_insights', () => {
      it('GET should allow access to workflow insights api endpoint', () => {
        fetchWorkflowInsights().then((response) => {
          expect(response.status).to.equal(200);
        });
      });
    });
    describe('/defend_insights', () => {
      it('GET should allow access to defend insights api endpoint', () => {
        fetchRunningDefendInsights().then((response) => {
          expect(response.status).to.equal(200);
        });
      });
    });
  }
);
