/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/migrations');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/migrations');
    });

    describe('7.16.0', () => {
      it('migrates legacy siem-detection-engine-rule-actions to use saved object references', async () => {
        const response = await es.get<{
          'siem-detection-engine-rule-actions': {
            ruleAlertId: string;
            actions: [{ id: string; actionRef: string }];
          };
          references: [{}];
        }>(
          {
            index: '.kibana',
            id: 'siem-detection-engine-rule-actions:fce024a0-0452-11ec-9b15-d13d79d162f3',
          },
          {
            meta: true,
          }
        );
        expect(response.statusCode).to.eql(200);

        // references exist and are expected values
        expect(response.body._source?.references).to.eql([
          {
            name: 'alert_0',
            id: 'fb1046a0-0452-11ec-9b15-d13d79d162f3',
            type: 'alert',
          },
          {
            name: 'action_0',
            id: 'f6e64c00-0452-11ec-9b15-d13d79d162f3',
            type: 'action',
          },
        ]);

        // actionRef exists and is the expected value
        expect(
          response.body._source?.['siem-detection-engine-rule-actions'].actions[0].actionRef
        ).to.eql('action_0');

        // ruleAlertId no longer exist
        expect(response.body._source?.['siem-detection-engine-rule-actions'].ruleAlertId).to.eql(
          undefined
        );

        // actions.id no longer exist
        expect(response.body._source?.['siem-detection-engine-rule-actions'].actions[0].id).to.eql(
          undefined
        );
      });

      it('migrates legacy siem-detection-engine-rule-actions and retains "ruleThrottle" and "alertThrottle" as the same attributes as before', async () => {
        const response = await es.get<{
          'siem-detection-engine-rule-actions': {
            ruleThrottle: string;
            alertThrottle: string;
          };
        }>(
          {
            index: '.kibana',
            id: 'siem-detection-engine-rule-actions:fce024a0-0452-11ec-9b15-d13d79d162f3',
          },
          {
            meta: true,
          }
        );
        expect(response.statusCode).to.eql(200);

        // "alertThrottle" and "ruleThrottle" should still exist
        expect(response.body._source?.['siem-detection-engine-rule-actions'].alertThrottle).to.eql(
          '7d'
        );
        expect(response.body._source?.['siem-detection-engine-rule-actions'].ruleThrottle).to.eql(
          '7d'
        );
      });
    });
  });
};
