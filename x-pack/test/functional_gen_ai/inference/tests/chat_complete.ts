/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import expect from '@kbn/expect';
import { supertestToObservable } from '@kbn/sse-utils-server';
import { FtrProviderContext } from '../ftr_provider_context';
import type { AvailableConnectorWithId } from '../../common/connectors';

export const chatCompleteSuite = (
  { id: connectorId }: AvailableConnectorWithId,
  { getService }: FtrProviderContext
) => {
  const supertest = getService('supertest');

  describe('chatComplete API', () => {
    it('returns a chat completion message for a simple prompt', async () => {
      const response = supertest
        .post(`/internal/inference/chat_complete/stream`)
        .set('kbn-xsrf', 'kibana')
        .send({
          connectorId,
          system: 'Please answer the user question',
          messages: [{ role: 'user', content: '2+2 ?' }],
        })
        .expect(200);

      const observable = supertestToObservable(response);

      const message = await lastValueFrom(observable);

      expect({
        ...message,
        content: '',
      }).to.eql({ type: 'chatCompletionMessage', content: '', toolCalls: [] });
      expect(message.content).to.contain('4');
    });
  });
};
