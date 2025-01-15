/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Request, RequestAdapter } from '@kbn/inspector-plugin/common';
import { FetcherResult } from '../../hooks/use_fetcher';

type InspectResponse = Request[];

export interface InspectorContextValue {
  addInspectorRequest: (result: FetcherResult<any>) => void;
  inspectorAdapters: { requests: RequestAdapter };
}

const value: InspectorContextValue = {
  addInspectorRequest: () => {},
  inspectorAdapters: { requests: new RequestAdapter() },
};

export const InspectorContext = createContext<InspectorContextValue>(value);

export interface InspectorRequestProps {
  mainStatisticsData?: { _inspect?: InspectResponse };
  _inspect?: InspectResponse;
}

export type AddInspectorRequest = (result: FetcherResult<InspectorRequestProps>) => void;

export function InspectorContextProvider({ children }: { children: ReactNode }) {
  const history = useHistory();
  const { inspectorAdapters } = value;

  function addInspectorRequest(
    result: FetcherResult<{
      mainStatisticsData?: { _inspect?: InspectResponse };
      _inspect?: InspectResponse;
    }>
  ) {
    const operations = result.data?._inspect ?? result.data?.mainStatisticsData?._inspect ?? [];

    operations.forEach((operation) => {
      if (operation.response) {
        const { id, name } = operation;
        const requestParams = { id, name };

        const requestResponder = inspectorAdapters.requests.start(
          name,
          requestParams,
          operation.startTime
        );

        requestResponder.json(operation.json as object);

        if (operation.stats) {
          requestResponder.stats(operation.stats);
        }

        requestResponder.finish(operation.status, operation.response);
      }
    });
  }

  useEffect(() => {
    const unregisterCallback = history.listen((newLocation) => {
      if (history.location.pathname !== newLocation.pathname) {
        inspectorAdapters.requests.reset();
      }
    });

    return () => {
      unregisterCallback();
    };
  }, [history, inspectorAdapters]);

  return (
    <InspectorContext.Provider value={{ ...value, addInspectorRequest }}>
      {children}
    </InspectorContext.Provider>
  );
}
