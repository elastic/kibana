/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_EVALUATE_URL,
  PostEvaluateBody,
} from '@kbn/elastic-assistant-common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  loadConnectorsFromEnvVar,
  loadLangSmithKeyFromEnvVar,
} from '../../../../scripts/genai/vault/manage_secrets';
import { FtrProviderContext } from '../../../../ftr_provider_context';

import {
  clearKnowledgeBase,
  deleteTinyElser,
  installTinyElser,
  setupKnowledgeBase,
} from '../../knowledge_base/entries/utils/helpers';

import { MachineLearningProvider } from '../../../../../functional/services/ml';
import { routeWithNamespace } from '../../../../../common/utils/security_solution';
import { loadEvalKnowledgeBaseEntries } from '../data/kb_entries';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const ml = getService('ml') as ReturnType<typeof MachineLearningProvider>;
  const esArchiver = getService('esArchiver');

  /**
   * Results will be written to LangSmith for project associated with the langSmithAPIKey, then later
   * aggregated in the below tracking sheet:
   * https://docs.google.com/spreadsheets/d/1kDNu98XR4eMIlKNq2iHlx5lVS5Npzm9cyDLyUVroiP8/edit?gid=0#gid=0
   *
   * Note: Suite is disabled in `.buildkite/ftr_security_stateful_configs.yml` as it has its own
   * weekly pipeline located at `.buildkite/pipelines/security_solution/gen_ai_evals.yml`
   */
  describe('@ess Basic Security AI Assistant Evaluations', () => {
    before(async () => {
      await installTinyElser({ ml, es, log });
      await setupKnowledgeBase(supertest, log);
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/attack_discovery_alerts'
      );
    });

    after(async () => {
      await deleteTinyElser({ ml, es, log });
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/security_solution/attack_discovery_alerts'
      );
    });

    afterEach(async () => {
      await clearKnowledgeBase(es);
    });

    describe('Run Evaluations', () => {
      const buildNumber = process.env.BUILDKITE_BUILD_NUMBER;
      const defaultEvalPayload: PostEvaluateBody = {
        runName: `Eval Automation${buildNumber ? ' - ' + buildNumber : ''}`,
        graphs: ['DefaultAssistantGraph'],
        datasetName: 'Sample Dataset',
        connectorIds: Object.keys(loadConnectorsFromEnvVar()),
        evaluatorConnectorId: 'gpt-4o',
        alertsIndexPattern: '.alerts-security.alerts-default',
        replacements: {},
        screenContext: {
          timeZone: 'America/Denver',
        },
        size: 10,
        langSmithApiKey: loadLangSmithKeyFromEnvVar(),
      };

      describe('Security Assistant', () => {
        it('should successfully run the "ES|QL Generation Regression Suite" dataset', async () => {
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAssistantGraph'],
            datasetName: 'ES|QL Generation Regression Suite',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
        });

        // Uses attack discovery alerts from episodes 1-8
        it('should successfully run the "Alerts RAG Regression (Episodes 1-8)" dataset', async () => {
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAssistantGraph'],
            datasetName: 'Alerts RAG Regression (Episodes 1-8)',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
        });

        it('should successfully run the "Assistant Eval: Custom Knowledge" dataset', async () => {
          await loadEvalKnowledgeBaseEntries(supertest, log);
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAssistantGraph'],
            datasetName: 'Assistant Eval: Custom Knowledge',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
        });
      });

      describe('Attack Discovery', () => {
        // Note: This LangSmith dataset includes alerts the alert data, so no need to preload the alerts
        it('should successfully run the "Eval AD: All Scenarios" dataset', async () => {
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAttackDiscoveryGraph'],
            datasetName: 'Attack Discovery: Episode 1',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
        });
      });
    });
  });
};
