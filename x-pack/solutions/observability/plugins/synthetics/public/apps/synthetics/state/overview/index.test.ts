/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitorOverviewReducer } from '.';
import { setOverviewPageStateAction } from './actions';

describe('monitorOverviewReducer', () => {
  describe('setOverviewPageStateAction (no-op suppression)', () => {
    // Why this exists:
    //
    // <ShowAllSpaces> mounts late on the management/overview pages — behind
    // <Loader> + an async useKibanaSpace() fetch — and on first mount it
    // dispatches `setOverviewPageStateAction({ showFromAllSpaces })` with the
    // value from localStorage even when that value already matches Redux.
    //
    // Before this change, the reducer always created a new `pageState`
    // object via `{ ...state.pageState, ...action.payload }`. That fresh
    // reference re-triggered the trailing `useDebounce` in
    // `useOverviewStatus`, which then fired a duplicate `/overview_status`
    // request right after the initial fetch had already returned.
    //
    // The reducer now assigns property-by-property, relying on Immer's
    // structural sharing to preserve `pageState` identity when nothing
    // actually changes. These tests pin that identity-preserving behaviour.

    it('preserves `pageState` identity when payload values match current state', () => {
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });
      const next = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({
          perPage: initial.pageState.perPage,
          sortOrder: initial.pageState.sortOrder,
          sortField: initial.pageState.sortField,
        })
      );

      expect(next.pageState).toBe(initial.pageState);
    });

    it('preserves `pageState` identity for a no-op `showFromAllSpaces: false` when the slot was already `false`', () => {
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });
      const withFalse = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({ showFromAllSpaces: false })
      );

      const next = monitorOverviewReducer(
        withFalse,
        setOverviewPageStateAction({ showFromAllSpaces: false })
      );

      expect(next.pageState).toBe(withFalse.pageState);
    });

    it('initialises `showFromAllSpaces` to `false` so the first <ShowAllSpaces> dispatch is a no-op', () => {
      // Pins the initial-state alignment with the localStorage default in
      // <ShowAllSpaces>. If this slot drifts back to `undefined`, the very
      // first mount-time dispatch (`{ showFromAllSpaces: false }`) becomes a
      // real change (`undefined !== false`), produces a fresh `pageState`
      // reference, and re-fires the trailing `useDebounce` in
      // `useOverviewStatus` after the initial /overview_status fetch — i.e.
      // the duplicate-request bug returns.
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });

      expect(initial.pageState.showFromAllSpaces).toBe(false);

      const next = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({ showFromAllSpaces: false })
      );

      expect(next.pageState).toBe(initial.pageState);
    });

    it('produces a new `pageState` reference when the payload changes a value', () => {
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });
      const next = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({ showFromAllSpaces: true })
      );

      expect(next.pageState).not.toBe(initial.pageState);
      expect(next.pageState.showFromAllSpaces).toBe(true);
    });

    it('produces a new `pageState` reference when only some of multiple keys change', () => {
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });
      const next = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({
          perPage: initial.pageState.perPage, // unchanged
          sortOrder: 'desc', // changed
        })
      );

      expect(next.pageState).not.toBe(initial.pageState);
      expect(next.pageState.sortOrder).toBe('desc');
      expect(next.pageState.perPage).toBe(initial.pageState.perPage);
    });

    it('treats `[]` from URL filter parsing as equivalent to a missing slot (no `pageState` reference change)', () => {
      // `parseFilters(undefined)` in `useGetUrlParams` returns a fresh `[]` on
      // every URL parse. Without `isPageStateSlotEqual` treating `undefined`
      // and `[]` as equivalent, the very first
      // `setOverviewPageStateAction({ useLogicalAndFor: [] })` dispatched from
      // `useMonitorFiltersState` mount would flip the slot from `undefined` to
      // `[]` and re-fire the trailing `useDebounce` in `useOverviewStatus`.
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });

      const next = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({
          useLogicalAndFor: [],
        })
      );

      expect(next.pageState).toBe(initial.pageState);
    });

    it('treats two `[]` references as equivalent so repeat URL re-parses are no-ops', () => {
      // After the first dispatch lands `useLogicalAndFor: []` into state, any
      // subsequent re-render that re-parses the URL produces a *new* `[]`
      // reference. We must compare contents, not identity, otherwise every
      // re-render flips `pageState` identity and re-fires the trailing
      // `useDebounce` chain.
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });
      const withEmpty = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({ useLogicalAndFor: [] })
      );

      const next = monitorOverviewReducer(
        withEmpty,
        setOverviewPageStateAction({ useLogicalAndFor: [] })
      );

      expect(next.pageState).toBe(withEmpty.pageState);
    });

    it('produces a new `pageState` reference when an array slot actually changes contents', () => {
      const initial = monitorOverviewReducer(undefined, { type: '@@INIT' });
      const next = monitorOverviewReducer(
        initial,
        setOverviewPageStateAction({
          useLogicalAndFor: ['tags'],
        })
      );

      expect(next.pageState).not.toBe(initial.pageState);
      expect(next.pageState.useLogicalAndFor).toEqual(['tags']);
    });
  });
});
