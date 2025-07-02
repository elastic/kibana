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
import os from 'os';
import { getSecurityGenAIConfigFromEnvVar } from '../../../../scripts/genai/vault/manage_secrets';
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
import { waitForEvaluationComplete } from './utils';

const TEST_TIMOUT = 60 * 60 * 1000;

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const ml = getService('ml') as ReturnType<typeof MachineLearningProvider>;
  const esArchiver = getService('esArchiver');
  const isEvalLocalPrompts = process.env.IS_SECURITY_AI_PROMPT_TEST === 'true';

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
      await es.ingest.putPipeline({
        id: 'set-timestamp-pipeline',
        description: 'Sets @timestamp field to current ingestion time',
        processors: [
          {
            set: {
              field: '@timestamp',
              value: '{{_ingest.timestamp}}',
            },
          },
        ],
      });
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/attack_discovery_alerts'
      );
      // if run is to test prompt changes, uninstall prompt integration to default to local prompts
      if (isEvalLocalPrompts) {
        // delete integration prompt saved objects
        const route = routeWithNamespace(`/api/saved_objects/epm-packages/security_ai_prompts`);
        await supertest.delete(route).set('kbn-xsrf', 'foo');
      }
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
      const buildNumber = process.env.BUILDKITE_BUILD_NUMBER || os.hostname();
      const prNumber = process.env.BUILDKITE_PULL_REQUEST;
      const config = getSecurityGenAIConfigFromEnvVar();
      const defaultEvalPayload: PostEvaluateBody = {
        runName: `Eval Automation${buildNumber ? ' | Build ' + buildNumber : ''}${
          prNumber ? ' | PR ' + prNumber : ''
        }${isEvalLocalPrompts ? ' | [Local Prompts]' : ''}`,
        graphs: ['DefaultAssistantGraph'],
        datasetName: 'Sample Dataset',
        connectorIds: Object.keys(config.connectors),
        evaluatorConnectorId: config.evaluatorConnectorId,
        alertsIndexPattern: '.alerts-security.alerts-default',
        replacements: {},
        screenContext: {
          timeZone: 'America/Denver',
        },
        size: 100,
        langSmithApiKey: config.langsmithKey,
      };

      describe('Security Assistant', () => {
        it('should successfully run the "ES|QL Generation Regression Suite" dataset', async () => {
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAssistantGraph'],
            datasetName: 'ES|QL Generation Regression Suite',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          const {
            body: { evaluationId },
          } = await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
          await waitForEvaluationComplete({ evaluationId, supertest, log, timeout: TEST_TIMOUT });
        }).timeout(TEST_TIMOUT);

        // Uses attack discovery alerts from episodes 1-8
        it('should successfully run the "Alerts RAG Regression (Episodes 1-8)" dataset', async () => {
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAssistantGraph'],
            datasetName: 'Alerts RAG Regression (Episodes 1-8)',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          const {
            body: { evaluationId },
          } = await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
          await waitForEvaluationComplete({ evaluationId, supertest, log, timeout: TEST_TIMOUT });
        }).timeout(TEST_TIMOUT);

        it('should successfully run the "Assistant Eval: Custom Knowledge" dataset', async () => {
          await loadEvalKnowledgeBaseEntries(supertest, log);
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAssistantGraph'],
            datasetName: 'Assistant Eval: Custom Knowledge',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          const {
            body: { evaluationId },
          } = await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
          await waitForEvaluationComplete({ evaluationId, supertest, log, timeout: TEST_TIMOUT });
        }).timeout(TEST_TIMOUT);
      });

      describe('Attack Discovery', () => {
        // Note: This LangSmith dataset includes alerts the alert data, so no need to preload the alerts
        it('should successfully run the "Eval AD: All Scenarios" dataset', async () => {
          const evalPayload: PostEvaluateBody = {
            ...defaultEvalPayload,
            graphs: ['DefaultAttackDiscoveryGraph'],
            datasetName: 'Eval AD: All Scenarios',
          };
          const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_EVALUATE_URL);
          const {
            body: { evaluationId },
          } = await supertest
            .post(route)
            .set('kbn-xsrf', 'true')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
            .send(evalPayload)
            .expect(200);
          await waitForEvaluationComplete({ evaluationId, supertest, log, timeout: TEST_TIMOUT });
        }).timeout(TEST_TIMOUT);
      });
    });
  });
};
