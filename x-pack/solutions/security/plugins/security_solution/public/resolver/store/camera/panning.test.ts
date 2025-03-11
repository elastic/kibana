/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store, Reducer, AnyAction } from 'redux';
import { createStore } from 'redux';
import { cameraReducer } from './reducer';
import type { AnalyzerById, Vector2 } from '../../types';
import { translation } from './selectors';
import { EMPTY_RESOLVER } from '../helpers';
import {
  userStartedPanning,
  userStoppedPanning,
  userNudgedCamera,
  userSetRasterSize,
  userMovedPointer,
} from './action';

describe('panning interaction', () => {
  let store: Store<AnalyzerById, AnyAction>;
  let translationShouldBeCloseTo: (expectedTranslation: Vector2) => void;
  let time: number;
  const id = 'test-id';

  beforeEach(() => {
    // The time isn't relevant as we don't use animations in this suite.
    time = 0;
    const testReducer: Reducer<AnalyzerById, AnyAction> = (
      state = {
        [id]: EMPTY_RESOLVER,
      },
      action
    ): AnalyzerById => cameraReducer(state, action);
    store = createStore(testReducer, undefined);
    translationShouldBeCloseTo = (expectedTranslation) => {
      const actualTranslation = translation(store.getState()[id].camera)(time);
      expect(expectedTranslation[0]).toBeCloseTo(actualTranslation[0]);
      expect(expectedTranslation[1]).toBeCloseTo(actualTranslation[1]);
    };
  });
  describe('when the raster size is 300 x 200 pixels', () => {
    beforeEach(() => {
      store.dispatch(userSetRasterSize({ id, dimensions: [300, 200] }));
    });
    it('should have a translation of 0,0', () => {
      translationShouldBeCloseTo([0, 0]);
    });
    describe('when the user has started panning at (100, 100)', () => {
      beforeEach(() => {
        store.dispatch(userStartedPanning({ id, screenCoordinates: [100, 100], time }));
      });
      it('should have a translation of 0,0', () => {
        translationShouldBeCloseTo([0, 0]);
      });
      describe('when the user moves their pointer 50px up and right (towards the top right of the screen)', () => {
        beforeEach(() => {
          store.dispatch(userMovedPointer({ id, screenCoordinates: [150, 50], time }));
        });
        it('should have a translation of [-50, -50] as the camera is now focused on things lower and to the left.', () => {
          translationShouldBeCloseTo([-50, -50]);
        });
        describe('when the user then stops panning', () => {
          beforeEach(() => {
            store.dispatch(userStoppedPanning({ id, time }));
          });
          it('should still have a translation of [-50, -50]', () => {
            translationShouldBeCloseTo([-50, -50]);
          });
        });
      });
    });
  });
  describe('when the user nudges the camera up', () => {
    beforeEach(() => {
      store.dispatch(userNudgedCamera({ id, direction: [0, 1], time }));
    });
    it('the camera eventually moves up so that objects appear closer to the bottom of the screen', () => {
      const aBitIntoTheFuture = time + 100;

      /**
       * Check the position once the animation has advanced 100ms
       */
      const actual: Vector2 = translation(store.getState()[id].camera)(aBitIntoTheFuture);
      expect(actual).toMatchInlineSnapshot(`
        Array [
          0,
          7.4074074074074066,
        ]
      `);
    });
  });
});
