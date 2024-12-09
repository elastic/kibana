/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';

import { mockGlobalState } from '../../mock';

import type { UpdateQueryParams, SetIsInspectedParams } from './helpers';
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

// TODO: remove socTrends check when socTrendsEnabled feature flag removed
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
  ...(state.socTrends
    ? {
        socTrends: {
          ...state.socTrends,
          linkTo: [],
        },
      }
    : {}),
};
const socTrendsGlobalLinkToState: InputsModel = {
  ...state,
  global: {
    ...state.global,
    linkTo: [InputsModelId.socTrends],
  },
  timeline: {
    ...state.timeline,
    linkTo: [],
  },
  ...(state.socTrends
    ? {
        socTrends: {
          ...state.socTrends,
          linkTo: [InputsModelId.global],
        },
      }
    : {}),
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
  ...(state.socTrends
    ? {
        socTrends: {
          ...state.socTrends,
          linkTo: [],
        },
      }
    : {}),
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
    describe('when timeline, global, and socTrends are lock', () => {
      test('timeline should be identical to global & socTrends should be previous time range when global change', () => {
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
        expect(newState.socTrends?.timerange).toEqual({
          kind: 'absolute',
          from: '2020-07-04T08:00:00.000Z',
          to: '2020-07-06T08:00:00.000Z',
        });
      });

      test('global should be identical to timeline & socTrends should be previous time range when timeline change', () => {
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
        expect(newState.socTrends?.timerange).toEqual({
          kind: 'absolute',
          from: '2020-07-03T02:00:00.000Z',
          to: '2020-07-05T22:00:00.000Z',
        });
      });

      test('global and timeline should be future time range when socTrends change', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-68h',
          toStr: 'NOTnow',
          from: '2020-07-01T00:00:00.000Z',
          to: '2020-07-02T00:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.socTrends,
          newTimerange,
          allLinkToState
        );
        expect(newState.global.timerange).toEqual({
          kind: 'absolute',
          from: '2020-07-02T00:00:00.000Z',
          to: '2020-07-03T00:00:00.000Z',
        });
        expect(newState.global.timerange).toEqual(newState.timeline.timerange);
        expect(newState.socTrends?.timerange).toEqual(newTimerange);
      });
    });

    describe('when timeline, global, and socTrends are NOT lock', () => {
      test('timeline and socTrends should remain unchanged when global change', () => {
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
        expect(newState.socTrends?.timerange).toEqual(emptyLinkToState.socTrends?.timerange);
        expect(newState.global.timerange).toEqual(newTimerange);
      });

      test('global and socTrends should remain unchanged when timeline change', () => {
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
        expect(newState.socTrends?.timerange).toEqual(emptyLinkToState.socTrends?.timerange);
        expect(newState.global.timerange).toEqual(emptyLinkToState.global.timerange);
      });

      test('timeline and global should remain unchanged when socTrends change', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-48h',
          toStr: 'now',
          from: '2020-07-06T08:00:00.000Z',
          to: '2020-07-08T08:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.socTrends,
          newTimerange,
          emptyLinkToState
        );
        expect(newState.timeline.timerange).toEqual(emptyLinkToState.timeline.timerange);
        expect(newState.global.timerange).toEqual(emptyLinkToState.global.timerange);
        expect(newState.socTrends?.timerange).toEqual(newTimerange);
      });
    });

    describe('when timeline and global only are lock', () => {
      test('timeline should be identical to global & socTrends should remain unchanged when global change', () => {
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
          timelineGlobalLinkToState
        );
        expect(newState.timeline.timerange).toEqual(newState.global.timerange);
        expect(newState.socTrends?.timerange).toEqual(
          timelineGlobalLinkToState.socTrends?.timerange
        );
      });

      test('global should be identical to timeline & socTrends should be previous time range when timeline change', () => {
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
          timelineGlobalLinkToState
        );
        expect(newState.timeline.timerange).toEqual(newState.global.timerange);
        expect(newState.socTrends?.timerange).toEqual(
          timelineGlobalLinkToState.socTrends?.timerange
        );
      });

      test('global and timeline should remain unchanged when socTrends change', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-68h',
          toStr: 'NOTnow',
          from: '2020-07-01T00:00:00.000Z',
          to: '2020-07-02T00:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.socTrends,
          newTimerange,
          timelineGlobalLinkToState
        );

        expect(newState.global.timerange).toEqual(timelineGlobalLinkToState.global.timerange);
        expect(newState.timeline.timerange).toEqual(timelineGlobalLinkToState.timeline.timerange);
        expect(newState.socTrends?.timerange).toEqual(newTimerange);
      });
    });

    describe('when socTrends and global only are lock', () => {
      test('timeline remain unchanged & socTrends should be previous time range when global change', () => {
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
          socTrendsGlobalLinkToState
        );
        expect(newState.timeline.timerange).toEqual(socTrendsGlobalLinkToState.timeline.timerange);
        expect(newState.global.timerange).toEqual(newTimerange);
        expect(newState.socTrends?.timerange).toEqual({
          kind: 'absolute',
          from: '2020-07-04T08:00:00.000Z',
          to: '2020-07-06T08:00:00.000Z',
        });
      });

      test('global & socTrends should remain unchanged when timeline change', () => {
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
          socTrendsGlobalLinkToState
        );
        expect(newState.timeline.timerange).toEqual(newTimerange);
        expect(newState.global.timerange).toEqual(socTrendsGlobalLinkToState.global.timerange);
        expect(newState.socTrends?.timerange).toEqual(
          socTrendsGlobalLinkToState.socTrends?.timerange
        );
      });

      test('global should update to future time and timeline should remain unchanged when socTrends change', () => {
        const newTimerange: TimeRange = {
          kind: 'relative',
          fromStr: 'now-68h',
          toStr: 'NOTnow',
          from: '2020-07-01T00:00:00.000Z',
          to: '2020-07-02T00:00:00.000Z',
        };
        const newState: InputsModel = updateInputTimerange(
          InputsModelId.socTrends,
          newTimerange,
          socTrendsGlobalLinkToState
        );

        expect(newState.timeline.timerange).toEqual(socTrendsGlobalLinkToState.timeline.timerange);
        expect(newState.global.timerange).toEqual({
          kind: 'absolute',
          from: '2020-07-02T00:00:00.000Z',
          to: '2020-07-03T00:00:00.000Z',
        });
        expect(newState.socTrends?.timerange).toEqual(newTimerange);
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
      test('More than 2 linkToIds passed', () => {
        expect(() =>
          addInputLink(
            [InputsModelId.global, InputsModelId.timeline, InputsModelId.socTrends],
            state
          )
        ).toThrow('Only link 2 input states at a time');
      });
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
      test('Do not link timeline and socTrends', () => {
        expect(() =>
          addInputLink([InputsModelId.timeline, InputsModelId.socTrends], state)
        ).toThrow('Do not link socTrends to timeline. Only link socTrends to global');
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
        expect(newState.socTrends?.linkTo).toEqual([]);
      });
      test('socTends and global linked, add timeline and socTrends to global, add global and socTrends to timeline', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          socTrendsGlobalLinkToState
        );
        expect(newState.global.linkTo.sort()).toEqual(
          [InputsModelId.socTrends, InputsModelId.timeline].sort()
        );
        expect(newState.timeline.linkTo.sort()).toEqual(
          [InputsModelId.global, InputsModelId.socTrends].sort()
        );
        expect(newState.socTrends?.linkTo.sort()).toEqual(
          [InputsModelId.global, InputsModelId.timeline].sort()
        );
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
        expect(newState.socTrends?.linkTo.sort()).toEqual(
          timelineGlobalLinkToState.socTrends?.linkTo.sort()
        );
      });
      test('socTends, timeline, and global linked, do not update state', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          allLinkToState
        );
        expect(newState.global.linkTo.sort()).toEqual(allLinkToState.global.linkTo.sort());
        expect(newState.timeline.linkTo.sort()).toEqual(allLinkToState.timeline.linkTo.sort());
        expect(newState.socTrends?.linkTo.sort()).toEqual(allLinkToState.socTrends?.linkTo.sort());
      });
    });
    describe(`linkToIds === ["global", "socTrends"]`, () => {
      test('no inputs linked, add socTrends to global, add global to socTrends', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          emptyLinkToState
        );
        expect(newState.global.linkTo).toEqual([InputsModelId.socTrends]);
        expect(newState.timeline.linkTo).toEqual([]);
        expect(newState.socTrends?.linkTo).toEqual([InputsModelId.global]);
      });
      test('timeline and global linked, add timeline and socTrends to global, add global and timeline to socTrends', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          timelineGlobalLinkToState
        );
        expect(newState.global.linkTo.sort()).toEqual(
          [InputsModelId.socTrends, InputsModelId.timeline].sort()
        );
        expect(newState.timeline.linkTo.sort()).toEqual(
          [InputsModelId.global, InputsModelId.socTrends].sort()
        );
        expect(newState.socTrends?.linkTo.sort()).toEqual(
          [InputsModelId.global, InputsModelId.timeline].sort()
        );
      });
      test('socTends and global linked, do not update state', () => {
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          socTrendsGlobalLinkToState
        );
        expect(newState.global.linkTo.sort()).toEqual(
          socTrendsGlobalLinkToState.global.linkTo.sort()
        );
        expect(newState.timeline.linkTo.sort()).toEqual(
          socTrendsGlobalLinkToState.timeline.linkTo.sort()
        );
        expect(newState.socTrends?.linkTo.sort()).toEqual(
          socTrendsGlobalLinkToState.socTrends?.linkTo.sort()
        );
      });
      test('socTrends, timeline, and global linked, do not update state', () => {
        const inputState: InputsModel = allLinkToState;
        const newState: InputsModel = addInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          inputState
        );
        expect(newState.global.linkTo.sort()).toEqual(inputState.global.linkTo.sort());
        expect(newState.timeline.linkTo.sort()).toEqual(inputState.timeline.linkTo.sort());
        expect(newState.socTrends?.linkTo.sort()).toEqual(inputState.socTrends?.linkTo.sort());
      });
    });
  });

  describe('#removeInputLink', () => {
    describe(`does not allow bad values`, () => {
      test('More than 2 linkToIds passed', () => {
        expect(() =>
          removeInputLink(
            [InputsModelId.global, InputsModelId.timeline, InputsModelId.socTrends],
            state
          )
        ).toThrow('Only remove linkTo from 2 input states at a time');
      });
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
      test('Do not link timeline and socTrends', () => {
        expect(() =>
          removeInputLink([InputsModelId.timeline, InputsModelId.socTrends], state)
        ).toThrow('Do not remove link socTrends to timeline. Only remove link socTrends to global');
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
        expect(newState.socTrends?.linkTo).toEqual(emptyLinkToState.socTrends?.linkTo);
      });
      test('socTrends and global linked, do nothing', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          socTrendsGlobalLinkToState
        );
        expect(newState.global.linkTo).toEqual(socTrendsGlobalLinkToState.global.linkTo);
        expect(newState.timeline.linkTo).toEqual(socTrendsGlobalLinkToState.timeline.linkTo);
        expect(newState.socTrends?.linkTo).toEqual(socTrendsGlobalLinkToState.socTrends?.linkTo);
      });
      test('timeline and global linked, remove link', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          timelineGlobalLinkToState
        );
        expect(newState.global.linkTo).toEqual([]);
        expect(newState.timeline.linkTo).toEqual([]);
        expect(newState.socTrends?.linkTo).toEqual([]);
      });
      test('socTrends, timeline, and global linked, unlink timeline/global only', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.timeline],
          allLinkToState
        );
        expect(newState.global.linkTo).toEqual([InputsModelId.socTrends]);
        expect(newState.timeline.linkTo).toEqual([]);
        expect(newState.socTrends?.linkTo).toEqual([InputsModelId.global]);
      });
    });
    describe(`linkToIds === ["global", "socTrends"]`, () => {
      test('no inputs linked, do nothing', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          emptyLinkToState
        );
        expect(newState.global.linkTo).toEqual(emptyLinkToState.global.linkTo);
        expect(newState.timeline.linkTo).toEqual(emptyLinkToState.timeline.linkTo);
        expect(newState.socTrends?.linkTo).toEqual(emptyLinkToState.socTrends?.linkTo);
      });
      test('timeline and global linked, do nothing', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          timelineGlobalLinkToState
        );
        expect(newState.global.linkTo).toEqual(timelineGlobalLinkToState.global.linkTo);
        expect(newState.timeline.linkTo).toEqual(timelineGlobalLinkToState.timeline.linkTo);
        expect(newState.socTrends?.linkTo).toEqual(timelineGlobalLinkToState.socTrends?.linkTo);
      });
      test('socTrends and global linked, remove link', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          socTrendsGlobalLinkToState
        );
        expect(newState.global.linkTo).toEqual([]);
        expect(newState.timeline.linkTo).toEqual([]);
        expect(newState.socTrends?.linkTo).toEqual([]);
      });
      test('socTrends, timeline, and global linked, unlink timeline/global only', () => {
        const newState: InputsModel = removeInputLink(
          [InputsModelId.global, InputsModelId.socTrends],
          allLinkToState
        );
        expect(newState.global.linkTo).toEqual([InputsModelId.timeline]);
        expect(newState.timeline.linkTo).toEqual([InputsModelId.global]);
        expect(newState.socTrends?.linkTo).toEqual([]);
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
          linkTo: [InputsModelId.timeline, InputsModelId.socTrends],
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
          linkTo: [InputsModelId.global, InputsModelId.socTrends],
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
        socTrends: state.socTrends,
      });
    });
  });
});
