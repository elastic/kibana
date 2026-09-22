/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux-v7';
import { combineReducers, createStore } from 'redux-v4';
import { I18nProvider } from '@kbn/i18n-react';
import { AddParamFlyout } from './add_param_flyout';
import type { GlobalParamsState } from '../../../state/global_params';
import {
  ADD_PARAM_SUCCESS_MESSAGE,
  EDIT_PARAM_SUCCESS_MESSAGE,
  addNewGlobalParamAction,
  editGlobalParamAction,
  globalParamsReducer,
} from '../../../state/global_params';
import type { SyntheticsParams } from '../../../../../../common/runtime_types';
import type { ListParamItem } from './params_list';

jest.mock('../../common/components/permissions', () => ({
  NoPermissionsTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../state/utils/fetch_effect', () => ({
  fetchEffectFactory: () => jest.fn(),
}));

jest.mock('../../../state/global_params/api', () => ({
  addGlobalParam: jest.fn(),
  deleteGlobalParams: jest.fn(),
  editGlobalParam: jest.fn(),
  getGlobalParams: jest.fn(),
}));

jest.mock('./add_param_form', () => ({
  AddParamForm: () => null,
}));

jest.mock('../../../../../utils/kibana_service', () => ({
  kibanaService: {
    toasts: {
      addSuccess: jest.fn(),
      addError: jest.fn(),
    },
  },
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          uptime: { save: true, show: true, configureSettings: true },
        },
      },
    },
  }),
}));

jest.mock('@kbn/security-plugin/public', () => ({
  ALL_SPACES_ID: '*',
}));

const savedParam: SyntheticsParams = {
  id: 'param-1',
  key: 'apiKey',
  value: 'secret',
};

const editingItem: ListParamItem = {
  ...savedParam,
  id: 'param-1',
};

const initialGlobalParams: GlobalParamsState = {
  isLoading: false,
  addError: null,
  isSaving: false,
  isDeleting: false,
  editError: null,
  listOfParams: [],
};

const createParamsStore = (preloaded?: Partial<GlobalParamsState>) =>
  createStore(combineReducers({ globalParams: globalParamsReducer }), {
    globalParams: { ...initialGlobalParams, ...preloaded },
  });

const renderFlyout = ({
  store,
  isEditingItem = null,
}: {
  store: ReturnType<typeof createParamsStore>;
  isEditingItem?: ListParamItem | null;
}) =>
  render(
    <I18nProvider>
      <Provider store={store}>
        <AddParamFlyout items={[]} isEditingItem={isEditingItem} setIsEditingItem={jest.fn()} />
      </Provider>
    </I18nProvider>
  );

describe('AddParamFlyout', () => {
  it('does not announce a stale save success when remounting with leftover savedData', () => {
    const store = createParamsStore({
      isSaving: false,
      savedData: savedParam,
    });
    const dispatch = jest.spyOn(store, 'dispatch');
    renderFlyout({ store });

    expect(screen.queryByText(ADD_PARAM_SUCCESS_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(EDIT_PARAM_SUCCESS_MESSAGE)).not.toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('announces add success only after a save that started during this mount', () => {
    const store = createParamsStore();
    renderFlyout({ store });

    act(() => {
      store.dispatch(addNewGlobalParamAction.get({ key: savedParam.key, value: savedParam.value }));
    });
    expect(screen.queryByText(ADD_PARAM_SUCCESS_MESSAGE)).not.toBeInTheDocument();

    act(() => {
      store.dispatch(addNewGlobalParamAction.success(savedParam));
    });
    expect(screen.getByText(ADD_PARAM_SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it('announces edit success after a save that started during this mount', () => {
    const store = createParamsStore();
    renderFlyout({ store, isEditingItem: editingItem });

    act(() => {
      store.dispatch(
        editGlobalParamAction.get({
          id: editingItem.id,
          paramRequest: { key: savedParam.key, value: savedParam.value },
        })
      );
    });
    act(() => {
      store.dispatch(editGlobalParamAction.success(savedParam));
    });

    expect(screen.getByText(EDIT_PARAM_SUCCESS_MESSAGE)).toBeInTheDocument();
  });

  it('re-announces the same success message on a subsequent save', () => {
    const store = createParamsStore();
    renderFlyout({ store });

    act(() => {
      store.dispatch(addNewGlobalParamAction.get({ key: savedParam.key, value: savedParam.value }));
    });
    act(() => {
      store.dispatch(addNewGlobalParamAction.success(savedParam));
    });
    expect(screen.getByText(ADD_PARAM_SUCCESS_MESSAGE)).toBeInTheDocument();

    act(() => {
      store.dispatch(addNewGlobalParamAction.get({ key: savedParam.key, value: savedParam.value }));
    });
    expect(screen.queryByText(ADD_PARAM_SUCCESS_MESSAGE)).not.toBeInTheDocument();

    act(() => {
      store.dispatch(addNewGlobalParamAction.success(savedParam));
    });
    expect(screen.getByText(ADD_PARAM_SUCCESS_MESSAGE)).toBeInTheDocument();
  });
});
