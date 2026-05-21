/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  PREBUILT_RULES_PACKAGE_NAME,
  ENDPOINT_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/common/detection_engine/constants';
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS,
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
  INITIALIZATION_FLOW_INIT_AI_PROMPTS,
  INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
} from '@kbn/security-solution-plugin/common/api/initialization';
import type { InitializationFlowId } from '@kbn/security-solution-plugin/common/api/initialization';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteEndpointFleetPackage, deletePrebuiltRulesFleetPackage } from '../../../../utils';

const PREBUILT_RULES_MAX_RETRIES = 5;

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');
  const retryService = getService('retry');

  const initializeFlows = (flows: InitializationFlowId[]) =>
    supertest
      .post(INITIALIZE_SECURITY_SOLUTION_URL)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '2023-10-31')
      .set('x-elastic-internal-origin', 'kibana')
      .send({ flows });

  describe('@ess @serverless @skipInServerlessMKI Initialize Security Solution', () => {
    beforeEach(async () => {
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
      await deleteEndpointFleetPackage({ supertest, es, log, retryService });
    });

    describe(INITIALIZATION_FLOW_CREATE_LIST_INDICES, () => {
      it('initializes list indices', async () => {
        const { body } = await initializeFlows([INITIALIZATION_FLOW_CREATE_LIST_INDICES]).expect(
          200
        );

        expect(body.flows[INITIALIZATION_FLOW_CREATE_LIST_INDICES]).toMatchObject({
          status: 'ready',
        });
      });
    });

    describe(INITIALIZATION_FLOW_SECURITY_DATA_VIEWS, () => {
      it('initializes security data views', async () => {
        const { body } = await initializeFlows([INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]).expect(
          200
        );

        expect(body.flows[INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]).toMatchObject({
          status: 'ready',
          payload: expect.objectContaining({
            defaultDataView: expect.objectContaining({ id: expect.any(String) }),
            alertDataView: expect.objectContaining({ id: expect.any(String) }),
            kibanaDataViews: expect.any(Array),
            signalIndexName: expect.any(String),
          }),
        });
      });
    });

    describe(INITIALIZATION_FLOW_INIT_PREBUILT_RULES, () => {
      const initializePrebuiltRulesWithRetry = async () => {
        return retryService.tryWithRetries(
          'initializePrebuiltRules',
          async () => {
            const { body } = await initializeFlows([INITIALIZATION_FLOW_INIT_PREBUILT_RULES])
              .timeout(INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS)
              .expect(200);

            expect(body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
              status: 'ready',
            });

            return body;
          },
          {
            retryCount: PREBUILT_RULES_MAX_RETRIES,
            timeout: INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS * PREBUILT_RULES_MAX_RETRIES,
          }
        );
      };
      it('installs the prebuilt rules package', async () => {
        const body = await initializePrebuiltRulesWithRetry();

        expect(body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
          status: 'ready',
          payload: expect.objectContaining({
            name: PREBUILT_RULES_PACKAGE_NAME,
            install_status: 'installed',
          }),
        });
      });

      it('returns already_installed when the package is up to date', async () => {
        await initializePrebuiltRulesWithRetry();

        const { body } = await initializeFlows([INITIALIZATION_FLOW_INIT_PREBUILT_RULES])
          .timeout(INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS)
          .expect(200);

        expect(body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
          status: 'ready',
          payload: expect.objectContaining({
            name: PREBUILT_RULES_PACKAGE_NAME,
            install_status: 'already_installed',
          }),
        });
      });

      it('handles many concurrent requests without errors', async () => {
        const requests = Array.from({ length: 100 }, () =>
          initializeFlows([INITIALIZATION_FLOW_INIT_PREBUILT_RULES])
            .timeout(INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS)
            .expect(200)
        );

        const responses = await Promise.all(requests);

        for (const { body } of responses) {
          expect(body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
            status: 'ready',
            payload: expect.objectContaining({
              name: PREBUILT_RULES_PACKAGE_NAME,
            }),
          });
        }
      });
    });

    describe(INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION, () => {
      it('installs the endpoint package', async () => {
        const { body } = await initializeFlows([
          INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
        ]).expect(200);

        expect(body.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toMatchObject({
          status: 'ready',
          payload: expect.objectContaining({
            name: ENDPOINT_PACKAGE_NAME,
          }),
        });
      });
    });

    describe(INITIALIZATION_FLOW_INIT_AI_PROMPTS, () => {
      it('returns a ready result', async () => {
        const { body } = await initializeFlows([INITIALIZATION_FLOW_INIT_AI_PROMPTS]).expect(200);

        expect(body.flows[INITIALIZATION_FLOW_INIT_AI_PROMPTS]).toMatchObject({
          status: 'ready',
        });
      });
    });

    describe(INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING, () => {
      it('installs detection rule monitoring assets', async () => {
        const { body } = await initializeFlows([
          INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
        ]).expect(200);

        expect(body.flows[INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING]).toMatchObject({
          status: 'ready',
        });
      });
    });

    describe('multiple flows in a single request', () => {
      it('runs all flows and returns results for each', async () => {
        const { body } = await retryService.tryWithRetries(
          'initializeAllFlows',
          async () => {
            const response = await initializeFlows([
              INITIALIZATION_FLOW_CREATE_LIST_INDICES,
              INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
              INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
              INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
              INITIALIZATION_FLOW_INIT_AI_PROMPTS,
              INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
            ])
              .timeout(INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS)
              .expect(200);

            expect(response.body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
              status: 'ready',
            });

            return response;
          },
          {
            retryCount: PREBUILT_RULES_MAX_RETRIES,
            timeout: INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS * PREBUILT_RULES_MAX_RETRIES,
          }
        );

        expect(body.flows[INITIALIZATION_FLOW_CREATE_LIST_INDICES]).toMatchObject({
          status: 'ready',
        });
        expect(body.flows[INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]).toMatchObject({
          status: 'ready',
          payload: expect.objectContaining({
            defaultDataView: expect.objectContaining({ id: expect.any(String) }),
          }),
        });
        expect(body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES]).toMatchObject({
          status: 'ready',
          payload: expect.objectContaining({ name: PREBUILT_RULES_PACKAGE_NAME }),
        });
        expect(body.flows[INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]).toMatchObject({
          status: 'ready',
          payload: expect.objectContaining({ name: ENDPOINT_PACKAGE_NAME }),
        });
        expect(body.flows[INITIALIZATION_FLOW_INIT_AI_PROMPTS]).toMatchObject({
          status: 'ready',
        });
        expect(body.flows[INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING]).toMatchObject({
          status: 'ready',
        });
      });
    });

    describe('validation', () => {
      it('rejects an empty flows array', async () => {
        await supertest
          .post(INITIALIZE_SECURITY_SOLUTION_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .set('x-elastic-internal-origin', 'kibana')
          .send({ flows: [] })
          .expect(400);
      });
    });
  });
};
