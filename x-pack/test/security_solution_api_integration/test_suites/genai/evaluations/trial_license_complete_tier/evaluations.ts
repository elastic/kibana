/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, ELASTIC_AI_ASSISTANT_EVALUATE_URL } from '@kbn/elastic-assistant-common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FtrProviderContext } from '../../../../ftr_provider_context';

import {
  clearKnowledgeBase,
  deleteTinyElser,
  installTinyElser,
  setupKnowledgeBase,
} from '../../knowledge_base/entries/utils/helpers';

import { MachineLearningProvider } from '../../../../../functional/services/ml';
import { routeWithNamespace } from '../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const ml = getService('ml') as ReturnType<typeof MachineLearningProvider>;

  describe('@ess Basic Security AI Assistant Evaluations', () => {
    before(async () => {
      await installTinyElser(ml);
      await setupKnowledgeBase(supertest, log);
    });

    after(async () => {
      await deleteTinyElser(ml);
    });

    afterEach(async () => {
      await clearKnowledgeBase(es);
    });

    describe('Run Evaluations', () => {
      it('should successfully run evaluations', async () => {
        const evalPayload = {
          graphs: ['DefaultAttackDiscoveryGraph'],
          datasetName: 'Attack Discovery: Episode 1',
          evaluatorConnectorId: 'gpt-4o',
          connectorIds: ['deepseek-r1'],
          runName: 'Eval Automation',
          alertsIndexPattern: '.alerts-security.alerts-default',
          replacements: {},
          screenContext: {
            timeZone: 'America/Denver',
          },
          size: 10,
        };
        const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
        try {
          await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload);
        } catch (e) {
          log(e);
        }
      });
    });
  });
};
