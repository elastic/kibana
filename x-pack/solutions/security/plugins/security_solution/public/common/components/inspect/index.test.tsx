/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { TestProviders, mockGlobalState, createMockStore } from '../../mock';
import type { State } from '../../store';
import type { UpdateQueryParams } from '../../store/inputs/helpers';
import { upsertQuery } from '../../store/inputs/helpers';

import { InspectButton } from '.';
import { cloneDeep } from 'lodash/fp';
import { InputsModelId } from '../../store/inputs/constants';

jest.mock('./modal', () => ({
  ModalInspectQuery: jest.fn(() => <div data-test-subj="mocker-modal" />),
}));

describe('Inspect Button', () => {
  const refetch = jest.fn();
  const state: State = mockGlobalState;
  const newQuery: UpdateQueryParams = {
    inputId: InputsModelId.global,
    id: 'myQuery',
    inspect: null,
    loading: false,
    refetch,
    state: state.inputs,
  };

  let store = createMockStore(state);

  describe('Render', () => {
    beforeEach(() => {
      const myState = cloneDeep(state);
      myState.inputs = upsertQuery(newQuery);
      store = createMockStore(myState);
    });

    test('Eui Empty Button', () => {
      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} inputId={InputsModelId.timeline} title="My title" />
        </TestProviders>
      );
      expect(screen.getByTestId('inspect-empty-button')).toBeInTheDocument();
    });

    test('it does NOT render the Eui Empty Button when timeline is timeline and compact is true', () => {
      render(
        <TestProviders store={store}>
          <InspectButton
            compact={true}
            queryId={newQuery.id}
            inputId={InputsModelId.timeline}
            title="My title"
          />
        </TestProviders>
      );
      expect(screen.queryByTestId('inspect-empty-button')).not.toBeInTheDocument();
    });

    test('it does NOT render the Empty Button when showInspectButton is false', () => {
      render(
        <TestProviders store={store}>
          <InspectButton
            queryId={newQuery.id}
            inputId={InputsModelId.timeline}
            showInspectButton={false}
            title="My title"
          />
        </TestProviders>
      );
      expect(screen.queryByTestId('inspect-empty-button')).not.toBeInTheDocument();
    });

    test('Eui Icon Button', () => {
      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(screen.getByTestId('inspect-icon-button')).toBeInTheDocument();
    });

    test('renders the Icon Button when inputId does NOT equal global, but compact is true', () => {
      render(
        <TestProviders store={store}>
          <InspectButton
            compact={true}
            inputId={InputsModelId.timeline}
            queryId={newQuery.id}
            title="My title"
          />
        </TestProviders>
      );
      expect(screen.getByTestId('inspect-icon-button')).toBeInTheDocument();
    });

    test('it does NOT render the Icon Button when showInspectButton is false', () => {
      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} showInspectButton={false} title="My title" />
        </TestProviders>
      );
      expect(screen.queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
    });

    test('Eui Empty Button disabled', () => {
      const { container } = render(
        <TestProviders store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(container.querySelector('.euiButtonIcon')).toBeDisabled();
    });

    test('Eui Icon Button disabled', () => {
      const { container } = render(
        <TestProviders store={store}>
          <InspectButton isDisabled={true} queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(container.querySelector('.euiButtonIcon')).toBeDisabled();
    });

    test('Button disabled when inspect == null', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = null;
      myState.inputs = upsertQuery(myQuery);
      store = createMockStore(myState);

      const { container } = render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(container.querySelector('.euiButtonIcon')).toBeDisabled();
    });

    test('Button disabled when inspect.dsl.length == 0', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: [],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      store = createMockStore(myState);

      const { container } = render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(container.querySelector('.euiButtonIcon')).toBeDisabled();
    });

    test('Button disabled when inspect.response.length == 0', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: [],
      };
      myState.inputs = upsertQuery(myQuery);
      store = createMockStore(myState);

      const { container } = render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );
      expect(container.querySelector('.euiButtonIcon')).toBeDisabled();
    });
  });

  describe('Modal Inspect - happy path', () => {
    beforeEach(() => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      store = createMockStore(myState);
    });

    test('Open Inspect Modal', async () => {
      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      fireEvent.click(screen.getByTestId('inspect-icon-button'));

      await waitFor(() => {
        expect(store.getState().inputs.global.queries[0].isInspected).toBe(true);
        expect(screen.getByTestId('mocker-modal')).toBeInTheDocument();
      });
    });

    test('Do not Open Inspect Modal if it is loading', async () => {
      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(store.getState().inputs.global.queries[0].isInspected).toBe(false);
      store.getState().inputs.global.queries[0].loading = true;

      fireEvent.click(screen.getByTestId('inspect-icon-button'));

      await waitFor(() => {
        expect(store.getState().inputs.global.queries[0].isInspected).toBe(true);
        expect(screen.queryByTestId('modal-inspect-close')).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Inspect - show or hide', () => {
    test('shows when request/response are complete and isInspected=true', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['a length'],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = true;
      store = createMockStore(myState);

      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(screen.getByTestId('mocker-modal')).toBeInTheDocument();
    });

    test('hides when request/response are complete and isInspected=false', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['a length'],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = false;
      store = createMockStore(myState);

      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(screen.queryByTestId('mocker-modal')).not.toBeInTheDocument();
    });

    test('hides when request is empty and isInspected=true', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: [],
        response: ['my response'],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = true;
      store = createMockStore(myState);

      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(screen.queryByTestId('mocker-modal')).not.toBeInTheDocument();
    });

    test('hides when response is empty and isInspected=true', () => {
      const myState = cloneDeep(state);
      const myQuery = cloneDeep(newQuery);
      myQuery.inspect = {
        dsl: ['my dsl'],
        response: [],
      };
      myState.inputs = upsertQuery(myQuery);
      myState.inputs.global.queries[0].isInspected = true;
      store = createMockStore(myState);

      render(
        <TestProviders store={store}>
          <InspectButton queryId={newQuery.id} title="My title" />
        </TestProviders>
      );

      expect(screen.queryByTestId('mocker-modal')).not.toBeInTheDocument();
    });
  });
});
