/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { AddIndicesLogic, AddIndicesLogicValues } from './add_indices_logic';

const DEFAULT_VALUES: AddIndicesLogicValues = {
  selectedIndices: [],
  updateSearchApplicationError: undefined,
  updateSearchApplicationStatus: Status.IDLE,
};

describe('AddIndicesLogic', () => {
  const { mount: mountAddIndicesLogic } = new LogicMounter(AddIndicesLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mountAddIndicesLogic();
  });

  it('has expected default values', () => {
    expect(AddIndicesLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setSelectedIndices', () => {
      it('adds the indices to selectedIndices', () => {
        AddIndicesLogic.actions.setSelectedIndices(['index-001', 'index-002']);

        expect(AddIndicesLogic.values.selectedIndices).toEqual(['index-001', 'index-002']);
      });

      it('replaces any existing indices', () => {
        AddIndicesLogic.actions.setSelectedIndices(['index-001', 'index-002']);
        AddIndicesLogic.actions.setSelectedIndices(['index-003', 'index-004']);

        expect(AddIndicesLogic.values.selectedIndices).toEqual(['index-003', 'index-004']);
      });
    });
  });

  describe('listeners', () => {
    describe('searchApplicationUpdated', () => {
      it('closes the add indices flyout', () => {
        jest.spyOn(AddIndicesLogic.actions, 'closeAddIndicesFlyout');

        AddIndicesLogic.actions.searchApplicationUpdated({
          indices: [],
          name: 'search-application-name',
          updated_at_millis: 2202018295,
        });

        expect(AddIndicesLogic.actions.closeAddIndicesFlyout).toHaveBeenCalledTimes(1);
      });
    });

    describe('submitSelectedIndices', () => {
      it('does not make a request if there are no selectedIndices', () => {
        jest.spyOn(AddIndicesLogic.actions, 'addIndicesToSearchApplication');

        AddIndicesLogic.actions.submitSelectedIndices();

        expect(AddIndicesLogic.actions.addIndicesToSearchApplication).toHaveBeenCalledTimes(0);
      });

      it('calls addIndicesToSearchApplication when there are selectedIndices', () => {
        jest.spyOn(AddIndicesLogic.actions, 'addIndicesToSearchApplication');

        AddIndicesLogic.actions.setSelectedIndices(['index-001', 'index-002']);
        AddIndicesLogic.actions.submitSelectedIndices();

        expect(AddIndicesLogic.actions.addIndicesToSearchApplication).toHaveBeenCalledTimes(1);
        expect(AddIndicesLogic.actions.addIndicesToSearchApplication).toHaveBeenCalledWith([
          'index-001',
          'index-002',
        ]);
      });
    });
  });
});
