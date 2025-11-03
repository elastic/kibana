/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { DATA_VIEW_ERROR } from './translations';

interface UseEventsDataViewReturnValue {
  status: 'loading' | 'error' | 'ready';
  dataView: DataView | undefined;
}

const reducer = (state: UseEventsDataViewReturnValue, action: DataView | unknown) => {
  if (action instanceof DataView) {
    return {
      status: 'ready',
      dataView: action,
    } satisfies UseEventsDataViewReturnValue;
  } else if (action instanceof Error) {
    return {
      ...state,
      status: 'error',
    } satisfies UseEventsDataViewReturnValue;
  }

  return state;
};

export const useCaseEventsDataView = (indexPattern: string): UseEventsDataViewReturnValue => {
  const { services } = useKibana();
  const toasts = useToasts();

  const [state, dispatch] = useReducer(reducer, {
    status: 'loading',
    dataView: undefined,
  } satisfies UseEventsDataViewReturnValue);

  useEffect(() => {
    const createAdhocDataView = async () => {
      try {
        const adhocDataView = await services.data.dataViews.create({
          title: indexPattern,
        });

        dispatch(adhocDataView);
      } catch (error: unknown) {
        dispatch(error);

        if (error instanceof Error) {
          if (error.name !== 'AbortError') {
            toasts.addError(error, {
              title: DATA_VIEW_ERROR,
            });
          }
        }
      }
    };

    createAdhocDataView();
  }, [indexPattern, services.data.dataViews, services.fieldFormats, toasts]);

  return state;
};
