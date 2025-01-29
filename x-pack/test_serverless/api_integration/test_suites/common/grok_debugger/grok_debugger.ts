/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

const API_BASE_PATH = '/api/grokdebugger';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;

  describe('Grok Debugger Routes', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });
    describe('Simulate', () => {
      it('should simulate a valid pattern', async () => {
        const rawEvent = '55.3.244.1 GET /index.html 15824 0.043';
        const pattern =
          '%{IP:client} %{WORD:method} %{URIPATHPARAM:request} %{NUMBER:bytes} %{NUMBER:duration}';
        const requestBody = { rawEvent, pattern };

        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/simulate`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set('Content-Type', 'application/json;charset=UTF-8')
          .send(requestBody)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        const expectedStructuredEvent = {
          duration: '0.043',
          request: '/index.html',
          method: 'GET',
          bytes: '15824',
          client: '55.3.244.1',
        };

        expect(body.structuredEvent).to.eql(expectedStructuredEvent);
        expect(body.error).to.be.empty();
      });

      it('should return error response for invalid pattern', async () => {
        const rawEvent = '55.3.244.1 GET /index.html 15824 0.043';
        const invalidPattern = 'test';
        const requestBody = { rawEvent, pattern: invalidPattern };

        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/simulate`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set('Content-Type', 'application/json;charset=UTF-8')
          .send(requestBody)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(body.error).to.eql('Provided Grok patterns do not match data in the input');
        expect(body.structuredEvent).to.be.empty();
      });

      it('should simulate with a valid custom pattern', async () => {
        const rawEvent =
          'Jan  1 06:25:43 mailserver14 postfix/cleanup[21403]: BEF25A72965: message-id=<20130101142543.5828399CCAF@mailserver14.example.com>';
        const pattern = '%{SYSLOGBASE} %{POSTFIX_QUEUEID:queue_id}: %{MSG:syslog_message}';
        const customPatterns = {
          MSG: 'message-id=<%{GREEDYDATA}>',
          POSTFIX_QUEUEID: '[0-9A-F]{10,11}',
        };
        const requestBody = { rawEvent, pattern, customPatterns };

        const { body } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/simulate`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set('Content-Type', 'application/json;charset=UTF-8')
          .send(requestBody)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        const expectedStructuredEvent = {
          pid: '21403',
          program: 'postfix/cleanup',
          logsource: 'mailserver14',
          syslog_message: 'message-id=<20130101142543.5828399CCAF@mailserver14.example.com>',
          queue_id: 'BEF25A72965',
          timestamp: 'Jan  1 06:25:43',
        };

        expect(body.structuredEvent).to.eql(expectedStructuredEvent);
        expect(body.error).to.be.empty();
      });
    });
  });
}
