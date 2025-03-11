/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../../../__mocks__/kea_logic';

import { Status } from '../../../../../../../common/types/api';
import { GenerateApiKeyLogic } from '../../../../api/generate_api_key/generate_api_key_logic';

import { GenerateApiKeyModalLogic } from './generate_api_key_modal.logic';

const DEFAULT_VALUES = {
  apiKey: '',
  data: undefined,
  isLoading: false,
  isSuccess: false,
  keyName: '',
  status: Status.IDLE,
};

describe('IndicesLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(GenerateApiKeyLogic);
  const { mount } = new LogicMounter(GenerateApiKeyModalLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    apiLogicMount();
    mount();
  });

  it('has expected default values', () => {
    expect(GenerateApiKeyModalLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setKeyName', () => {
      it('sets keyName value to the reducer', () => {
        const keyName = 'test-key-name  8888*^7896&*^*&';
        expect(GenerateApiKeyModalLogic.values).toEqual(DEFAULT_VALUES);
        GenerateApiKeyModalLogic.actions.setKeyName(keyName);
        expect(GenerateApiKeyModalLogic.values).toEqual({
          ...DEFAULT_VALUES,
          keyName,
        });
      });
    });
  });

  describe('reducers', () => {
    describe('keyName', () => {
      it('updates when setKeyName action is triggered', () => {
        const keyName = 'test-key-name';
        expect(GenerateApiKeyModalLogic.values).toEqual(DEFAULT_VALUES);
        GenerateApiKeyModalLogic.actions.setKeyName(keyName);
        expect(GenerateApiKeyModalLogic.values).toEqual({
          ...DEFAULT_VALUES,
          keyName,
        });
      });
    });
  });

  describe('selectors', () => {
    describe('apiKey', () => {
      it('updates when apiSuccess listener triggered', () => {
        expect(GenerateApiKeyModalLogic.values).toEqual(DEFAULT_VALUES);
        GenerateApiKeyLogic.actions.apiSuccess({
          apiKey: {
            api_key: 'some-api-key-123123',
            encoded: 'encoded-api-key123123==',
            id: 'api_key_id',
            name: 'test-key-123',
          },
        });

        expect(GenerateApiKeyModalLogic.values).toEqual({
          apiKey: 'encoded-api-key123123==',
          data: {
            apiKey: {
              api_key: 'some-api-key-123123',
              encoded: 'encoded-api-key123123==',
              id: 'api_key_id',
              name: 'test-key-123',
            },
          },
          isLoading: false,
          isSuccess: true,
          keyName: '',
          status: Status.SUCCESS,
        });
      });
    });

    describe('isLoading', () => {
      it('should update with API status', () => {
        expect(GenerateApiKeyModalLogic.values).toEqual(DEFAULT_VALUES);
        GenerateApiKeyLogic.actions.makeRequest({ indexName: 'test', keyName: 'test' });

        expect(GenerateApiKeyModalLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
          status: Status.LOADING,
        });
      });
    });

    describe('isSuccess', () => {
      it('should update with API status', () => {
        expect(GenerateApiKeyModalLogic.values).toEqual(DEFAULT_VALUES);
        GenerateApiKeyLogic.actions.apiSuccess({
          apiKey: {
            api_key: 'some-api-key-123123',
            encoded: 'encoded-api-key123123==',
            id: 'api_key_id',
            name: 'test-key-123',
          },
        });

        expect(GenerateApiKeyModalLogic.values).toEqual({
          apiKey: 'encoded-api-key123123==',
          data: {
            apiKey: {
              api_key: 'some-api-key-123123',
              encoded: 'encoded-api-key123123==',
              id: 'api_key_id',
              name: 'test-key-123',
            },
          },
          isLoading: false,
          isSuccess: true,
          keyName: '',
          status: Status.SUCCESS,
        });
      });
    });
  });
});
