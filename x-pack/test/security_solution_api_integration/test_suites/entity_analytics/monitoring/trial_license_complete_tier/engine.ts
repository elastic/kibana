/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Entity Store APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);

    before(async () => {
      await dataView.create('security-solution');
      try {
        const { body } = await supertest
          .put('/internal/core/_settings')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'true')
          .send({
            'feature_flags.overrides': {
              EntityAnalyticsPrivilegeMonitoring: true,
            },
          })
          .expect(200);

        log.info(`Set internal core settings`);
        log.info(JSON.stringify(body));
      } catch (err) {
        log.error(`Error setting internal core settings`);
        log.error(err);
      }
    });

    after(async () => {
      await dataView.delete('security-solution');
    });

    describe('health', () => {
      it('should be healthy', async () => {
        log.info(`Checking health of privilege monitoring`);
        const res = await api.privMonHealth();

        if (res.status !== 200) {
          log.error(`Health check failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
      });
    });
  });
};
