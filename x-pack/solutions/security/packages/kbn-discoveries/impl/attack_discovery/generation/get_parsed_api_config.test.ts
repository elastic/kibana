/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getParsedApiConfig } from './get_parsed_api_config';

describe('getParsedApiConfig', () => {
  describe('when model is present', () => {
    const apiConfig = {
      action_type_id: '.gen-ai',
      connector_id: 'test-connector-id',
      model: 'gpt-4',
      provider: 'OpenAI',
    };

    it('returns action_type_id', () => {
      const result = getParsedApiConfig(apiConfig);

      expect(result.action_type_id).toBe('.gen-ai');
    });

    it('returns connector_id', () => {
      const result = getParsedApiConfig(apiConfig);

      expect(result.connector_id).toBe('test-connector-id');
    });

    it('returns model', () => {
      const result = getParsedApiConfig(apiConfig);

      expect(result.model).toBe('gpt-4');
    });

    it('returns provider', () => {
      const result = getParsedApiConfig(apiConfig);

      expect(result.provider).toBe('OpenAI');
    });
  });

  describe('when model is undefined', () => {
    it('returns model as undefined', () => {
      const result = getParsedApiConfig({
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
      });

      expect(result.model).toBeUndefined();
    });
  });

  describe('when provider is undefined', () => {
    it('returns provider as undefined', () => {
      const result = getParsedApiConfig({
        action_type_id: '.gen-ai',
        connector_id: 'test-connector-id',
      });

      expect(result.provider).toBeUndefined();
    });
  });

  describe('when camelCase keys are provided (schedule params format)', () => {
    const camelCaseApiConfig = {
      actionTypeId: '.gen-ai',
      connectorId: 'test-connector-id',
      model: 'gpt-4',
      provider: 'OpenAI',
    };

    it('returns action_type_id from actionTypeId', () => {
      const result = getParsedApiConfig(camelCaseApiConfig);

      expect(result.action_type_id).toBe('.gen-ai');
    });

    it('returns connector_id from connectorId', () => {
      const result = getParsedApiConfig(camelCaseApiConfig);

      expect(result.connector_id).toBe('test-connector-id');
    });

    it('returns model', () => {
      const result = getParsedApiConfig(camelCaseApiConfig);

      expect(result.model).toBe('gpt-4');
    });

    it('returns provider', () => {
      const result = getParsedApiConfig(camelCaseApiConfig);

      expect(result.provider).toBe('OpenAI');
    });
  });

  describe('when camelCase keys are provided without model', () => {
    it('returns model as undefined', () => {
      const result = getParsedApiConfig({
        actionTypeId: '.gen-ai',
        connectorId: 'test-connector-id',
      });

      expect(result.model).toBeUndefined();
    });
  });

  describe('when snake_case keys take precedence over camelCase', () => {
    it('prefers action_type_id over actionTypeId when both exist', () => {
      const result = getParsedApiConfig({
        action_type_id: '.bedrock',
        actionTypeId: '.gen-ai',
        connector_id: 'snake-id',
        connectorId: 'camel-id',
      });

      expect(result.action_type_id).toBe('.bedrock');
      expect(result.connector_id).toBe('snake-id');
    });
  });

  describe('when action_type_id and actionTypeId are both missing', () => {
    it('falls back to provider for action_type_id', () => {
      const result = getParsedApiConfig({
        connector_id: 'test-connector-id',
        model: 'claude-v3',
        provider: '.bedrock',
      });

      expect(result.action_type_id).toBe('.bedrock');
      expect(result.provider).toBe('.bedrock');
    });

    it('returns empty string when provider is also missing', () => {
      const result = getParsedApiConfig({
        connector_id: 'test-connector-id',
      });

      expect(result.action_type_id).toBe('');
    });
  });
});
