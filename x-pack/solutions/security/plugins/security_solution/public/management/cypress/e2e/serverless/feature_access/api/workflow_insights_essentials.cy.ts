/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchWorkflowInsights, updateWorkflowInsights } from '../../../../tasks/insights';
import { login, ROLE } from '../../../../tasks/login';

describe(
  'Workflow Insights APIs',
  {
    tags: ['@serverless', '@skipInServerlessMKI'], // remove @skipInServerlessMKI once changes are merged
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify(['defendInsights'])}`,
        ],
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
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
        fetchWorkflowInsights({ failOnStatusCode: false }).then((response) => {
          expect(response.status).to.equal(403);
        });
      });
      it('UPDATE should allow access to workflow insights api endpoint', () => {
        updateWorkflowInsights().then((response) => {
          expect(response.status).to.equal(403);
        });
      });
    });
  }
);
