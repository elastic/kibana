/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { isOpenSourceModel } from './utils';
import {
  OPENAI_CHAT_URL,
  OpenAiProviderType,
} from '@kbn/stack-connectors-plugin/common/openai/constants';

describe('Utils', () => {
  describe('isOpenSourceModel', () => {
    it('should return `false` when connector is undefined', async () => {
      const isOpenModel = isOpenSourceModel();
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a Bedrock', async () => {
      const connector = { actionTypeId: '.bedrock' } as Connector;
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a Gemini', async () => {
      const connector = { actionTypeId: '.gemini' } as Connector;
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a OpenAI and API url is not specified', async () => {
      const connector = {
        actionTypeId: '.gen-ai',
      } as unknown as Connector;
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a OpenAI and OpenAI API url is specified', async () => {
      const connector = {
        actionTypeId: '.gen-ai',
        config: { apiUrl: OPENAI_CHAT_URL },
      } as unknown as Connector;
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `false` when connector is a AzureOpenAI', async () => {
      const connector = {
        actionTypeId: '.gen-ai',
        config: { apiProvider: OpenAiProviderType.AzureAi },
      } as unknown as Connector;
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(false);
    });

    it('should return `true` when connector is a OpenAI and non-OpenAI API url is specified', async () => {
      const connector = {
        actionTypeId: '.gen-ai',
        config: { apiUrl: 'https://elastic.llm.com/llama/chat/completions' },
      } as unknown as Connector;
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(true);
    });

    it('should return `true` when apiProvider of OpenAiProviderType.Other is specified', async () => {
      const connector = {
        actionTypeId: '.gen-ai',
        config: {
          apiUrl: OPENAI_CHAT_URL,
          apiProvider: OpenAiProviderType.Other,
        },
      } as unknown as Connector;
      const isOpenModel = isOpenSourceModel(connector);
      expect(isOpenModel).toEqual(true);
    });
  });
});
