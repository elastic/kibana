/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { call, put, takeEvery } from 'redux-saga/effects';

import { Action } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { kibanaService } from '../../../../utils/kibana_service';
import { serializeHttpFetchError } from '../utils/http_error';
import { EsActionPayload, EsActionResponse, executeEsQueryAction } from './actions';
import { executeEsQueryAPI } from './api';

export function* executeEsQueryEffect() {
  const inProgressRequests = new Set<string>();

  yield takeEvery(
    String(executeEsQueryAction.get),
    function* (action: Action<EsActionPayload>): Generator {
      try {
        if (!inProgressRequests.has(action.payload.name)) {
          inProgressRequests.add(action.payload.name);

          const response = (yield call(executeEsQueryAPI, action.payload)) as EsActionResponse;

          inProgressRequests.delete(action.payload.name);

          yield put(executeEsQueryAction.success(response));
        }
      } catch (e) {
        inProgressRequests.delete(action.payload.name);
        const serializedError = serializeHttpFetchError(e, action.payload);
        kibanaService.coreSetup.notifications.toasts.addError(
          { ...e, message: serializedError.body?.message ?? e.message },
          {
            title: ES_QUERY_FAIL_MESSAGE,
          }
        );
        yield put(executeEsQueryAction.fail(serializedError));
      }
    }
  );
}

const ES_QUERY_FAIL_MESSAGE = i18n.translate('xpack.synthetics.esQuery.failed', {
  defaultMessage: 'ES query failed.',
});
