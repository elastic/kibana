/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface State {
  loading: boolean;
  error: Error | null;
}
export type Action = { type: 'start' } | { type: 'error'; error: Error } | { type: 'success' };

export const initialState: State = { loading: false, error: null };
export const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'start':
      return { loading: true, error: null };
    case 'error':
      return { loading: false, error: action.error };
    case 'success':
      return { loading: false, error: null };
    default:
      return state;
  }
};
