/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { localStorageMock } from '../../__mocks__';
import {
  EXPANDABLE_FLYOUT_LOCAL_STORAGE,
  PUSH_VS_OVERLAY_LOCAL_STORAGE,
  USER_COLLAPSED_WIDTH_LOCAL_STORAGE,
  USER_EXPANDED_WIDTH_LOCAL_STORAGE,
  USER_SECTION_WIDTHS_LOCAL_STORAGE,
} from '../constants';
import {
  clearAllUserWidthsFromLocalStorageMiddleware,
  savePushVsOverlayToLocalStorageMiddleware,
  saveUserFlyoutWidthsToLocalStorageMiddleware,
  saveUserSectionWidthsToLocalStorageMiddleware,
} from './middlewares';
import { createAction } from 'redux-toolkit-v1';
import {
  changeUserCollapsedWidthAction,
  changeUserExpandedWidthAction,
  changeUserSectionWidthsAction,
  changePushVsOverlayAction,
  resetAllUserChangedWidthsAction,
} from './actions';

const noTypeAction = createAction<{
  type: 'no_type';
}>('no_type_action');
const randomAction = createAction<{
  type: 'random_type';
}>('random_action');

describe('middlewares', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  describe('savePushVsOverlayToLocalStorageMiddleware', () => {
    it('should ignore action without type', () => {
      savePushVsOverlayToLocalStorageMiddleware()(vi.fn)(noTypeAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should ignore action of types other than changePushVsOverlayAction', () => {
      savePushVsOverlayToLocalStorageMiddleware()(vi.fn)(randomAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should save value to local storage if action is of type changePushVsOverlayAction', () => {
      savePushVsOverlayToLocalStorageMiddleware()(vi.fn)(
        changePushVsOverlayAction({ type: 'push', savedToLocalStorage: true })
      );

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(
        JSON.stringify({ [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'push' })
      );
    });

    it('should not save value to local storage if savedToLocalStorage is false', () => {
      savePushVsOverlayToLocalStorageMiddleware()(vi.fn)(
        changePushVsOverlayAction({ type: 'push', savedToLocalStorage: false })
      );
      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });
  });

  describe('saveUserFlyoutWidthsToLocalStorageMiddleware', () => {
    it('should ignore action without type', () => {
      saveUserFlyoutWidthsToLocalStorageMiddleware()(vi.fn)(noTypeAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should ignore action of other types', () => {
      saveUserFlyoutWidthsToLocalStorageMiddleware()(vi.fn)(randomAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should save collapsed value to local storage if action is of type changeUserCollapsedWidthAction', () => {
      saveUserFlyoutWidthsToLocalStorageMiddleware()(vi.fn)(
        changeUserCollapsedWidthAction({ width: 250, savedToLocalStorage: true })
      );

      const expandableFlyout = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      expect(expandableFlyout).not.toBe(null);

      if (expandableFlyout) {
        expect(JSON.parse(expandableFlyout)[USER_COLLAPSED_WIDTH_LOCAL_STORAGE]).toEqual(250);
      }
    });

    it('should save expanded value to local storage if action is of type changeUserExpandedWidthAction', () => {
      saveUserFlyoutWidthsToLocalStorageMiddleware()(vi.fn)(
        changeUserExpandedWidthAction({ width: 500, savedToLocalStorage: true })
      );

      const expandableFlyout = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      expect(expandableFlyout).not.toBe(null);

      if (expandableFlyout) {
        expect(JSON.parse(expandableFlyout)[USER_EXPANDED_WIDTH_LOCAL_STORAGE]).toEqual(500);
      }
    });

    it('should not save collapsed value to local storage if savedToLocalStorage is false', () => {
      saveUserFlyoutWidthsToLocalStorageMiddleware()(vi.fn)(
        changeUserCollapsedWidthAction({ width: 250, savedToLocalStorage: false })
      );

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should not save expanded value to local storage if savedToLocalStorage is false', () => {
      saveUserFlyoutWidthsToLocalStorageMiddleware()(vi.fn)(
        changeUserExpandedWidthAction({ width: 500, savedToLocalStorage: false })
      );

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });
  });

  describe('saveUserSectionWidthsToLocalStorageMiddleware', () => {
    it('should ignore action without type', () => {
      saveUserSectionWidthsToLocalStorageMiddleware()(vi.fn)(noTypeAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should ignore action of other types ', () => {
      saveUserSectionWidthsToLocalStorageMiddleware()(vi.fn)(randomAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should save section width values to local storage if action is of type changeUserSectionWidthsAction', () => {
      saveUserSectionWidthsToLocalStorageMiddleware()(vi.fn)(
        changeUserSectionWidthsAction({
          left: 500,
          right: 500,
          savedToLocalStorage: true,
        })
      );

      const expandableFlyout = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      expect(expandableFlyout).not.toBe(null);

      if (expandableFlyout) {
        expect(JSON.parse(expandableFlyout)[USER_SECTION_WIDTHS_LOCAL_STORAGE]).toEqual({
          left: 500,
          right: 500,
        });
      }
    });

    it('should not save section width values to local storage if savedToLocalStorage is false', () => {
      saveUserSectionWidthsToLocalStorageMiddleware()(vi.fn)(
        changeUserSectionWidthsAction({
          left: 500,
          right: 500,
          savedToLocalStorage: false,
        })
      );

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });
  });

  describe('clearAllUserWidthsFromLocalStorageMiddleware', () => {
    it('should ignore action without type', () => {
      clearAllUserWidthsFromLocalStorageMiddleware()(vi.fn)(noTypeAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should ignore action of other types ', () => {
      clearAllUserWidthsFromLocalStorageMiddleware()(vi.fn)(randomAction);

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should clear width values from local storage if action is of type resetUserCollapsedWidthAction', () => {
      localStorage.setItem(
        EXPANDABLE_FLYOUT_LOCAL_STORAGE,
        JSON.stringify({
          [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'push',
          [USER_COLLAPSED_WIDTH_LOCAL_STORAGE]: 250,
          [USER_EXPANDED_WIDTH_LOCAL_STORAGE]: 500,
          [USER_SECTION_WIDTHS_LOCAL_STORAGE]: { left: 50, right: 50 },
        })
      );

      clearAllUserWidthsFromLocalStorageMiddleware()(vi.fn)(resetAllUserChangedWidthsAction());

      const expandableFlyout = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      expect(expandableFlyout).not.toBe(null);

      if (expandableFlyout) {
        const parsed = JSON.parse(expandableFlyout);
        expect(parsed[PUSH_VS_OVERLAY_LOCAL_STORAGE]).toEqual('push');
        expect(expandableFlyout).not.toHaveProperty(USER_COLLAPSED_WIDTH_LOCAL_STORAGE);
        expect(expandableFlyout).not.toHaveProperty(USER_EXPANDED_WIDTH_LOCAL_STORAGE);
        expect(expandableFlyout).not.toHaveProperty(USER_SECTION_WIDTHS_LOCAL_STORAGE);
      }
    });
  });
});
