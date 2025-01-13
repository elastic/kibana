/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockFlashMessagesActions,
  mockHttpValues,
  mockKibanaValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { HttpError, Status } from '../../../../../common/types/api';

import { AddAnalyticsCollectionLogic } from './add_analytics_collection_logic';

describe('addAnalyticsCollectionLogic', () => {
  const { mount } = new LogicMounter(AddAnalyticsCollectionLogic);
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;
  const { setFlashMessages } = mockFlashMessagesActions;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(AddAnalyticsCollectionLogic.values).toEqual({
      canSubmit: false,
      error: undefined,
      inputError: null,
      isLoading: false,
      isSuccess: false,
      isSystemError: false,
      name: '',
      status: Status.IDLE,
    });
  });

  describe('actions', () => {
    describe('setNameValue', () => {
      it('should set name', () => {
        AddAnalyticsCollectionLogic.actions.setNameValue('valid');
        expect(AddAnalyticsCollectionLogic.values.name).toEqual('valid');
      });
    });

    describe('setInputError', () => {
      it('should set error', () => {
        AddAnalyticsCollectionLogic.actions.setInputError('invalid name');
        expect(AddAnalyticsCollectionLogic.values.inputError).toEqual('invalid name');
      });
    });
  });

  describe('listeners', () => {
    describe('onApiSuccess', () => {
      it('should flash a success toast and navigate to collection view', async () => {
        jest.useFakeTimers({ legacyFakeTimers: true });

        const { navigateToUrl } = mockKibanaValues;

        AddAnalyticsCollectionLogic.actions.apiSuccess({
          event_retention_day_length: 180,
          events_datastream: 'logs-elastic_analytics.events-test',
          id: 'test',
          name: 'test',
        } as AnalyticsCollection);

        expect(flashSuccessToast).toHaveBeenCalled();
        jest.advanceTimersByTime(1000);
        await nextTick();
        expect(navigateToUrl).toHaveBeenCalledWith('/collections/test/overview');
        jest.useRealTimers();
      });
    });

    describe('onApiError', () => {
      it('should call setFlashMessages with an error when system error with message', () => {
        const httpError: HttpError = {
          body: {
            error: 'Bad Gateway',
            message: 'Something went wrong',
            statusCode: 502,
          },
          fetchOptions: {},
          request: {},
        } as HttpError;
        AddAnalyticsCollectionLogic.actions.apiError(httpError);

        expect(flashAPIErrors).not.toHaveBeenCalled();
        expect(setFlashMessages).toHaveBeenCalledWith([
          {
            description: 'Something went wrong',
            message: 'Sorry, there was an error creating your collection.',
            type: 'error',
          },
        ]);
      });

      it('should flash a default error toast when system error without message', () => {
        const httpError: HttpError = {
          body: {
            error: 'Bad Gateway',
            statusCode: 502,
          },
          fetchOptions: {},
          request: {},
        } as HttpError;
        AddAnalyticsCollectionLogic.actions.apiError(httpError);

        expect(flashAPIErrors).toHaveBeenCalledWith(httpError);
      });

      it('should set input error when is client error', () => {
        const errorMessage = 'Collection already exists';
        const httpError: HttpError = {
          body: {
            error: 'Conflict',
            message: errorMessage,
            statusCode: 409,
          },
          fetchOptions: {},
          request: {},
        } as HttpError;
        AddAnalyticsCollectionLogic.actions.setInputError = jest.fn();
        AddAnalyticsCollectionLogic.actions.apiError(httpError);

        expect(AddAnalyticsCollectionLogic.actions.setInputError).toHaveBeenCalledWith(
          errorMessage
        );
      });
    });

    describe('createAnalyticsCollection', () => {
      it('should call make request', () => {
        mount({
          name: 'test',
        });
        AddAnalyticsCollectionLogic.actions.makeRequest = jest.fn();
        AddAnalyticsCollectionLogic.actions.createAnalyticsCollection();
        expect(AddAnalyticsCollectionLogic.actions.makeRequest).toHaveBeenCalledWith({
          name: 'test',
        });
      });
    });

    describe('setNameValue', () => {
      it('should call an error if name is not valid', () => {
        AddAnalyticsCollectionLogic.actions.setNameValue('Invalid');
        expect(AddAnalyticsCollectionLogic.values.inputError).toBeTruthy();
      });

      it('should remove error if name become valid', () => {
        AddAnalyticsCollectionLogic.actions.setNameValue('Invalid');
        expect(AddAnalyticsCollectionLogic.values.inputError).toBeTruthy();
        AddAnalyticsCollectionLogic.actions.setNameValue('valid');
        expect(AddAnalyticsCollectionLogic.values.inputError).toBeFalsy();
      });
    });
  });

  describe('selectors', () => {
    describe('status', () => {
      it('updates when makeRequest triggered', () => {
        const promise = Promise.resolve({ name: 'result' });
        http.post.mockReturnValue(promise);
        AddAnalyticsCollectionLogic.actions.makeRequest({ name: 'test' });

        expect(AddAnalyticsCollectionLogic.values.isLoading).toBe(true);
        expect(AddAnalyticsCollectionLogic.values.status).toBe(Status.LOADING);
      });

      it('updates when apiSuccess listener triggered', () => {
        AddAnalyticsCollectionLogic.actions.apiSuccess({
          events_datastream: 'logs-elastic_analytics.events-test',
          name: 'test',
        });

        expect(AddAnalyticsCollectionLogic.values.isSuccess).toBe(true);
        expect(AddAnalyticsCollectionLogic.values.status).toBe(Status.SUCCESS);
      });
    });

    describe('isSystemError', () => {
      it('set true when error is 50x', () => {
        expect(AddAnalyticsCollectionLogic.values.isSystemError).toBe(false);
        AddAnalyticsCollectionLogic.actions.apiError({
          body: {
            error: 'Bad Gateway',
            message: 'Something went wrong',
            statusCode: 502,
          },
        } as HttpError);

        expect(AddAnalyticsCollectionLogic.values.isSystemError).toBe(true);
        expect(AddAnalyticsCollectionLogic.values.status).toBe(Status.ERROR);
      });

      it('keep false if error code is 40x', () => {
        AddAnalyticsCollectionLogic.actions.apiError({
          body: {
            error: 'Conflict',
            message: 'Something went wrong',
            statusCode: 409,
          },
        } as HttpError);

        expect(AddAnalyticsCollectionLogic.values.isSystemError).toBe(false);
        expect(AddAnalyticsCollectionLogic.values.status).toBe(Status.ERROR);
      });
    });
  });
});
