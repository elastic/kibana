/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';

import { mockGlobalState } from '../../mock';

import type { SetIsInspectedParams, UpdateQueryParams } from './helpers';
import {
  addInputLink,
  deleteOneQuery,
  removeInputLink,
  setIsInspected,
  toggleLockTimeline,
  updateInputTimerange,
  upsertQuery,
} from './helpers';
import type { InputsModel, TimeRange } from './model';
import { InputsModelId } from './constants';

let state = mockGlobalState.inputs;

const emptyLinkToState: InputsModel = {
  ...state,
  global: {
    ...state.global,
    linkTo: [],
  },
  timeline: {
    ...state.timeline,
    linkTo: [],
  },
};
const timelineGlobalLinkToState: InputsModel = {
  ...state,
  global: {
    ...state.global,
    linkTo: [InputsModelId.timeline],
  },
  timeline: {
    ...state.timeline,
    linkTo: [InputsModelId.global],
  },
};
const allLinkToState: InputsModel = state;

describe('Inputs', () => {
  describe('#toggleLockTimeline', () => {
    test('remove timeline Lock from inputs', () => {
      const newState: InputsModel = toggleLockTimeline(timelineGlobalLinkToState);
      expect(newState.timeline.linkTo).toEqual([]);
      expect(newState.global.linkTo).toEqual([]);
    });

    test('Add timeline Lock from inputs', () => {
      const newState: InputsModel = toggleLockTimeline(emptyLinkToState);
      expect(newState.timeline.linkTo).toEqual([InputsModelId.global]);
      expect(newState.global.linkTo).toEqual([InputsModelId.timeline]);
    });
  });

  describe('#updateInputTimerange', () => {
    describe('when timeline and global are lock', () => {
      test('timeline should be identical to global', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-48h',
          toStr: 'now',
          from: '2020-07-06T08:00:00.000Z',
          to: '2020-07-08T08:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.global,
          newTimerange,
          allLinkToState
        );
        expect(newState.timeline.timerange).toEqual(newState.global.timerange);
      });

      test('global should be identical to timeline', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-68h',
          toStr: 'NOTnow',
          from: '2020-07-05T22:00:00.000Z',
          to: '2020-07-08T18:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.timeline,
          newTimerange,
          allLinkToState
        );
        expect(newState.timeline.timerange).toEqual(newState.global.timerange);
      });
    });

    describe('when timeline and global are NOT lock', () => {
      test('timeline should remain unchanged when global change', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-48h',
          toStr: 'now',
          from: '2020-07-06T08:00:00.000Z',
          to: '2020-07-08T08:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.global,
          newTimerange,
          emptyLinkToState
        );
        expect(newState.timeline.timerange).toEqual(emptyLinkToState.timeline.timerange);
        expect(newState.global.timerange).toEqual(newTimerange);
      });

      test('global should remain unchanged when timeline change', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-68h',
          toStr: 'NOTnow',
          from: '2020-07-05T22:00:00.000Z',
          to: '2020-07-08T18:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.timeline,
          newTimerange,
          emptyLinkToState
        );
        expect(newState.timeline.timerange).toEqual(newTimerange);
        expect(newState.global.timerange).toEqual(emptyLinkToState.global.timerange);
      });
    });
  });

  describe('#upsertQuery', () => {
    test('make sure you can add a query', () => {
      const refetch = jest.fn();
      const newQuery: UpdateQueryParams = {
        inputId: InputsModelId.global,
        id: 'myQuery',
        inspect: null,
        loading: false,
        refetch,
        state,
      };
      const newState: InputsModel = upsertQuery(newQuery);

      expect(newState.global.queries[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: false,
        loading: false,
        refetch,
        selectedInspectIndex: 0,
      });
    });

    test('make sure you can update a query', () => {
      const refetch = jest.fn();
      const newQuery: UpdateQueryParams = {
        inputId: InputsModelId.global,
        id: 'myQuery',
        inspect: null,
        loading: false,
        refetch,
        state,
      };
      let newState: InputsModel = upsertQuery(newQuery);

      newQuery.loading = true;
      newQuery.state = newState;
      newState = upsertQuery(newQuery);

      expect(newState.global.queries[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: false,
        loading: true,
        refetch,
        selectedInspectIndex: 0,
      });
    });
  });

  describe('#setIsInspected', () => {
    const refetch = jest.fn();
    beforeEach(() => {
      state = cloneDeep(mockGlobalState.inputs);
      const newQuery: UpdateQueryParams = {
        inputId: InputsModelId.global,
        id: 'myQuery',
        inspect: null,
        loading: false,
        refetch,
        state,
      };
      state = upsertQuery(newQuery);
    });
    test('make sure you can set isInspected with a positive value', () => {
      const newQuery: SetIsInspectedParams = {
        inputId: InputsModelId.global,
        id: 'myQuery',
        isInspected: true,
        selectedInspectIndex: 0,
        state,
      };
      const newState: InputsModel = setIsInspected(newQuery);

      expect(newState.global.queries[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: true,
        loading: false,
        refetch,
        selectedInspectIndex: 0,
      });
    });

    test('make sure you can set isInspected with a negative value', () => {
      const newQuery: SetIsInspectedParams = {
        inputId: InputsModelId.global,
        id: 'myQuery',
        isInspected: false,
        selectedInspectIndex: 0,
        state,
      };
      const newState: InputsModel = setIsInspected(newQuery);

      expect(newState.global.queries[0]).toEqual({
        id: 'myQuery',
        inspect: null,
        isInspected: false,
        loading: false,
        refetch,
        selectedInspectIndex: 0,
      });
    });
  });

  describe('#addInputLink', () => {
    describe(`does not allow bad values`, () => {
      test('Less than 2 linkToIds passed', () => {
        expect(() => addInputLink([InputsModelId.global], state)).toThrow(
          'Only link 2 input states at a time'
        );
      });

      test('Identical linkToIds passed', () => {
        expect(() => addInputLink([InputsModelId.global, InputsModelId.global], state)).toThrow(
          'Input linkTo cannot link to itself'
        );
      });
    });

    describe(`linkToIds === ["global", "timeline"]`, () => {
      test('no inputs linked, add timeline to global, add global to timeline', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          emptyLinkToState
        );
        expect(newState.global.linkTo).toEqual([InputsModelId.timeline]);
        expect(newState.timeline.linkTo).toEqual([InputsModelId.global]);
      });

      test('timeline and global linked, do not update state', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          timelineGlobalLinkToState
        );
        expect(newState.global.linkTo.sort()).toEqual(
          timelineGlobalLinkToState.global.linkTo.sort()
        );
        expect(newState.timeline.linkTo.sort()).toEqual(
          timelineGlobalLinkToState.timeline.linkTo.sort()
        );
      });

      test('timeline, and global linked, do not update state', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          allLinkToState
        );
        expect(newState.global.linkTo.sort()).toEqual(allLinkToState.global.linkTo.sort());
        expect(newState.timeline.linkTo.sort()).toEqual(allLinkToState.timeline.linkTo.sort());
      });
    });
  });

  describe('#removeInputLink', () => {
    describe(`does not allow bad values`, () => {
      test('Less than 2 linkToIds passed', () => {
        expect(() => removeInputLink([InputsModelId.global], state)).toThrow(
          'Only remove linkTo from 2 input states at a time'
        );
      });

      test('Identical linkToIds passed', () => {
        expect(() => removeInputLink([InputsModelId.global, InputsModelId.global], state)).toThrow(
          'Input linkTo cannot remove link to itself'
        );
      });
    });

    describe(`linkToIds === ["global", "timeline"]`, () => {
      test('no inputs linked, do nothing', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          emptyLinkToState
        );
        expect(newState.global.linkTo).toEqual(emptyLinkToState.global.linkTo);
        expect(newState.timeline.linkTo).toEqual(emptyLinkToState.timeline.linkTo);
      });

      test('timeline and global linked, remove link', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          timelineGlobalLinkToState
        );
        expect(newState.global.linkTo).toEqual([]);
        expect(newState.timeline.linkTo).toEqual([]);
      });

      test('timeline and global linked, unlink timeline/global only', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          allLinkToState
        );
        expect(newState.global.linkTo).toEqual([]);
        expect(newState.timeline.linkTo).toEqual([]);
      });
    });
  });

  describe('#deleteOneQuery', () => {
    test('make sure that we only delete one query', () => {
      const refetch = jest.fn();
      const newQuery: UpdateQueryParams = {
        inputId: InputsModelId.global,
        id: 'myQuery',
        inspect: null,
        loading: false,
        refetch,
        state,
      };
      let newState: InputsModel = upsertQuery(newQuery);
      const deleteQuery: UpdateQueryParams = {
        inputId: InputsModelId.global,
        id: 'deleteQuery',
        inspect: null,
        loading: false,
        refetch,
        state: newState,
      };
      newState = upsertQuery(deleteQuery);
      expect(
        deleteOneQuery({
          inputId: InputsModelId.global,
          id: 'deleteQuery',
          state: newState,
        })
      ).toEqual({
        global: {
          linkTo: [InputsModelId.timeline],
          policy: {
            duration: 300000,
            kind: 'manual',
          },
          queries: [
            {
              id: 'myQuery',
              inspect: null,
              isInspected: false,
              loading: false,
              refetch,
              selectedInspectIndex: 0,
            },
          ],
          timerange: {
            from: '2020-07-07T08:20:18.966Z',
            fromStr: 'now/d',
            kind: 'relative',
            to: '2020-07-08T08:20:18.966Z',
            toStr: 'now/d',
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        timeline: {
          linkTo: [InputsModelId.global],
          policy: {
            duration: 300000,
            kind: 'manual',
          },
          queries: [],
          timerange: {
            from: '2020-07-07T08:20:18.966Z',
            fromStr: 'now/d',
            kind: 'relative',
            to: '2020-07-08T08:20:18.966Z',
            toStr: 'now/d',
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
        valueReport: state.valueReport,
      });
    });
  });
});
