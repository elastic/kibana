/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, MessageAddEvent } from '@kbn/observability-ai-assistant-plugin/common';
import expect from '@kbn/expect';
import { LlmProxy, createLlmProxy } from '../../../common/create_llm_proxy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { getMessageAddedEvents, invokeChatCompleteWithFunctionRequest } from './helpers';
import {
  createProxyActionConnector,
  deleteActionConnector,
} from '../../../common/action_connectors';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantAPIClient');

  describe('when calling the alerts function', () => {
    let proxy: LlmProxy;
    let connectorId: string;
    let alertsEvents: MessageAddEvent[];

    const start = 'now-100h';
    const end = 'now';

    before(async () => {
      proxy = await createLlmProxy(log);
      connectorId = await createProxyActionConnector({ supertest, log, port: proxy.getPort() });

      void proxy
        .intercept('conversation', () => true, 'Hello from LLM Proxy')
        .completeAfterIntercept();

      const alertsResponseBody = await invokeChatCompleteWithFunctionRequest({
        connectorId,
        observabilityAIAssistantAPIClient,
        functionCall: {
          name: 'alerts',
          trigger: MessageRole.Assistant,
          arguments: JSON.stringify({ start, end }),
        },
      });

      await proxy.waitForAllInterceptorsSettled();

      alertsEvents = getMessageAddedEvents(alertsResponseBody);
    });

    after(async () => {
      proxy.close();
      await deleteActionConnector({ supertest, connectorId, log });
    });

    // This test ensures that invoking the alerts function does not result in an error.
    it('should execute the function without any errors', async () => {
      const alertsFunctionResponse = alertsEvents[0];
      expect(alertsFunctionResponse.message.message.name).to.be('alerts');

      const parsedAlertsResponse = JSON.parse(alertsFunctionResponse.message.message.content!);

      expect(parsedAlertsResponse).not.to.have.property('error');
      expect(parsedAlertsResponse).to.have.property('total');
      expect(parsedAlertsResponse).to.have.property('alerts');
      expect(parsedAlertsResponse.alerts).to.be.an('array');
      expect(parsedAlertsResponse.total).to.be(0);
      expect(parsedAlertsResponse.alerts.length).to.be(0);
    });
  });
}
