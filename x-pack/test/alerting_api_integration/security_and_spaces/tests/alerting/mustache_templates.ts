/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * These tests ensure that the per-action mustache template escaping works
 * for actions we have simulators for.  It arranges to have an alert that
 * schedules an action that will contain "escapable" characters in it, and
 * then validates that the simulator receives the escaped versions.
 */

import http from 'http';
import getPort from 'get-port';
import axios from 'axios';
import httpProxy from 'http-proxy';

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getSlackServer } from '../../../common/fixtures/plugins/actions_simulators/server/plugin';
import { getHttpProxyServer } from '../../../common/lib/get_proxy_server';

// eslint-disable-next-line import/no-default-export
export default function executionStatusAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const configService = getService('config');

  describe('mustacheTemplates', () => {
    const objectRemover = new ObjectRemover(supertest);
    let slackSimulatorURL: string = '';
    let slackServer: http.Server;
    let proxyServer: httpProxy | undefined;

    before(async () => {
      slackServer = await getSlackServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!slackServer.listening) {
        slackServer.listen(availablePort);
      }
      slackSimulatorURL = `http://localhost:${availablePort}`;

      proxyServer = await getHttpProxyServer(
        slackSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {}
      );
    });

    after(async () => {
      await objectRemover.removeAll();
      slackServer.close();

      if (proxyServer) {
        proxyServer.close();
      }
    });

    it('should render kibanaBaseUrl as non-empty string since configured', async () => {
      const actionResponse = await supertest
        .post(`${getUrlPrefix(Spaces[0].id)}/api/actions/connector`)
        .set('kbn-xsrf', 'test')
        .send({
          name: 'testing context variable expansion',
          connector_type_id: '.slack',
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        });
      expect(actionResponse.status).to.eql(200);
      const createdAction = actionResponse.body;
      objectRemover.add(Spaces[0].id, createdAction.id, 'connector', 'actions');

      const varsTemplate = 'kibanaBaseUrl: "{{kibanaBaseUrl}}"';

      const alertResponse = await supertest
        .post(`${getUrlPrefix(Spaces[0].id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            name: 'testing context variable kibanaBaseUrl',
            rule_type_id: 'test.patternFiring',
            params: {
              pattern: { instance: [true, true] },
            },
            actions: [
              {
                id: createdAction.id,
                group: 'default',
                params: {
                  message: `message {{alertId}} - ${varsTemplate}`,
                },
              },
            ],
          })
        );
      expect(alertResponse.status).to.eql(200);
      const createdAlert = alertResponse.body;
      objectRemover.add(Spaces[0].id, createdAlert.id, 'rule', 'alerting');

      const body = await retry.try(async () =>
        waitForActionBody(slackSimulatorURL, createdAlert.id)
      );
      expect(body).to.be('kibanaBaseUrl: "https://localhost:5601"');
    });
  });

  async function waitForActionBody(url: string, id: string): Promise<string> {
    const response = await axios.get<string[]>(url);
    expect(response.status).to.eql(200);

    for (const datum of response.data) {
      const match = datum.match(/^(.*) - (.*)$/);
      if (match == null) continue;

      if (match[1] === id) return match[2];
    }

    throw new Error(`no action body posted yet for id ${id}`);
  }
}
