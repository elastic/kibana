/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitorListReducer } from '.';
import { updateManagementPageStateAction } from './actions';

describe('monitorListReducer', () => {
  describe('updateManagementPageStateAction (no-op suppression)', () => {
    // Why this exists:
    //
    // Several mount-time effects on the management page dispatch
    // `updateManagementPageStateAction` with values that may already match
    // Redux state — e.g. `useFilters` re-emitting the current `configIds` /
    // `useLogicalAndFor` from the URL, or <ShowAllSpaces> re-emitting its
    // localStorage default after <Loader> resolves.
    //
    // Before this change, the reducer always created a new `pageState` object
    // via `{ ...state.pageState, ...action.payload }`. That fresh reference
    // re-triggered the trailing `useDebounce` in `useMonitorList`, causing a
    // duplicate `/api/synthetics/monitors` request right after the initial
    // fetch had already returned.
    //
    // The reducer now assigns property-by-property and relies on Immer's
    // structural sharing to preserve `pageState` identity when nothing
    // actually changes. These tests pin that behaviour.

    it('preserves `pageState` identity when payload values match current state', () => {
      const initial = monitorListReducer(undefined, { type: '@@INIT' });
      const next = monitorListReducer(
        initial,
        updateManagementPageStateAction({
          pageIndex: initial.pageState.pageIndex,
          pageSize: initial.pageState.pageSize,
        })
      );

      expect(next.pageState).toBe(initial.pageState);
    });

    it('preserves `pageState` identity for repeated `showFromAllSpaces: false` dispatches', () => {
      const initial = monitorListReducer(undefined, { type: '@@INIT' });
      const withFalse = monitorListReducer(
        initial,
        updateManagementPageStateAction({ showFromAllSpaces: false })
      );

      const next = monitorListReducer(
        withFalse,
        updateManagementPageStateAction({ showFromAllSpaces: false })
      );

      expect(next.pageState).toBe(withFalse.pageState);
    });

    it('initialises `showFromAllSpaces` to `false` so the first <ShowAllSpaces> dispatch is a no-op', () => {
      // Pins the alignment between the management `pageState` initial value
      // and the localStorage default in <ShowAllSpaces>. If this slot drifts
      // back to `undefined`, the very first mount-time dispatch
      // (`{ showFromAllSpaces: false }`) becomes a real change
      // (`undefined !== false`), produces a fresh `pageState` reference, and
      // re-fires the trailing `useDebounce` in `useMonitorList` after the
      // initial /api/synthetics/monitors fetch — i.e. the duplicate-request
      // bug returns.
      const initial = monitorListReducer(undefined, { type: '@@INIT' });

      expect(initial.pageState.showFromAllSpaces).toBe(false);

      const next = monitorListReducer(
        initial,
        updateManagementPageStateAction({ showFromAllSpaces: false })
      );

      expect(next.pageState).toBe(initial.pageState);
    });

    it('preserves `pageState` identity for `configIds: undefined` when the slot is already undefined', () => {
      const initial = monitorListReducer(undefined, { type: '@@INIT' });
      const next = monitorListReducer(
        initial,
        updateManagementPageStateAction({ configIds: undefined })
      );

      expect(next.pageState).toBe(initial.pageState);
    });

    it('produces a new `pageState` reference when a value changes', () => {
      const initial = monitorListReducer(undefined, { type: '@@INIT' });
      const next = monitorListReducer(initial, updateManagementPageStateAction({ pageIndex: 2 }));

      expect(next.pageState).not.toBe(initial.pageState);
      expect(next.pageState.pageIndex).toBe(2);
    });

    it('produces a new `pageState` reference when only one of multiple keys changes', () => {
      const initial = monitorListReducer(undefined, { type: '@@INIT' });
      const next = monitorListReducer(
        initial,
        updateManagementPageStateAction({
          pageSize: initial.pageState.pageSize, // unchanged
          pageIndex: 5, // changed
        })
      );

      expect(next.pageState).not.toBe(initial.pageState);
      expect(next.pageState.pageIndex).toBe(5);
      expect(next.pageState.pageSize).toBe(initial.pageState.pageSize);
    });

    it('treats `configIds: []` from URL parsing as equivalent to a missing slot', () => {
      // `useMonitorFiltersState`'s mount effect dispatches
      // `updateManagementPageStateAction({ configIds: [] })` because
      // `parseFilters(undefined)` returns a fresh `[]`. Without
      // `isPageStateSlotEqual`, the very first dispatch flips `configIds` from
      // `undefined` to `[]` and re-fires the trailing `useDebounce` in
      // `useMonitorList` after the initial /api/synthetics/monitors fetch.
      const initial = monitorListReducer(undefined, { type: '@@INIT' });

      const next = monitorListReducer(initial, updateManagementPageStateAction({ configIds: [] }));

      expect(next.pageState).toBe(initial.pageState);
    });

    it('treats two `[]` references as equivalent so URL re-parses are no-ops', () => {
      const initial = monitorListReducer(undefined, { type: '@@INIT' });
      const withEmpty = monitorListReducer(
        initial,
        updateManagementPageStateAction({ useLogicalAndFor: [] })
      );

      const next = monitorListReducer(
        withEmpty,
        updateManagementPageStateAction({ useLogicalAndFor: [] })
      );

      expect(next.pageState).toBe(withEmpty.pageState);
    });

    it('produces a new `pageState` reference when an array slot actually changes contents', () => {
      const initial = monitorListReducer(undefined, { type: '@@INIT' });
      const next = monitorListReducer(
        initial,
        updateManagementPageStateAction({ useLogicalAndFor: ['tags'] })
      );

      expect(next.pageState).not.toBe(initial.pageState);
      expect(next.pageState.useLogicalAndFor).toEqual(['tags']);
    });
  });
});
