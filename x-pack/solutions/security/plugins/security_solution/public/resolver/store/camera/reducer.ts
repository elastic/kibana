/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Draft } from 'immer';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { unitsPerNudge, nudgeAnimationDuration } from './scaling_constants';
import { animatePanning } from './methods';
import * as vector2 from '../../models/vector2';
import * as selectors from './selectors';
import { clamp } from '../../lib/math';
import type { CameraState, Vector2 } from '../../types';
import { initialAnalyzerState, immerCase } from '../helpers';
import {
  userSetZoomLevel,
  userClickedZoomOut,
  userClickedZoomIn,
  userZoomed,
  userStartedPanning,
  userStoppedPanning,
  userSetPositionOfCamera,
  userNudgedCamera,
  userSetRasterSize,
  userMovedPointer,
} from './action';

export const cameraReducer = reducerWithInitialState(initialAnalyzerState)
  .withHandling(
    immerCase(userSetZoomLevel, (draft, { id, zoomLevel }) => {
      /**
       * Handle the scale being explicitly set, for example by a 'reset zoom' feature, or by a range slider with exact scale values
       */
      const state: Draft<CameraState> = draft[id].camera;
      state.scalingFactor = clamp(zoomLevel, 0, 1);
      return draft;
    })
  )
  .withHandling(
    immerCase(userClickedZoomIn, (draft, { id }) => {
      const state: Draft<CameraState> = draft[id].camera;
      state.scalingFactor = clamp(state.scalingFactor + 0.1, 0, 1);
      return draft;
    })
  )
  .withHandling(
    immerCase(userClickedZoomOut, (draft, { id }) => {
      const state: Draft<CameraState> = draft[id].camera;
      state.scalingFactor = clamp(state.scalingFactor - 0.1, 0, 1);
      return draft;
    })
  )
  .withHandling(
    immerCase(userZoomed, (draft, { id, zoomChange, time }) => {
      const state: Draft<CameraState> = draft[id].camera;
      const stateWithNewScaling: Draft<CameraState> = {
        ...state,
        scalingFactor: clamp(state.scalingFactor + zoomChange, 0, 1),
      };
      /**
       * Zooming fundamentally just changes the scale, but that would always zoom in (or out) around the center of the map. The user might be interested in
       * something else, like a node. If the user has moved their pointer on to the map, we can keep the pointer over the same point in the map by adjusting the
       * panning when we zoom.
       *
       * You can see this in action by moving your pointer over a node that isn't directly in the center of the map and then changing the zoom level. Do it by
       * using CTRL and the mousewheel, or by pinching the trackpad on a Mac. The node will stay under your mouse cursor and other things in the map will get
       * nearer or further from the mouse cursor. This lets you keep your context when changing zoom levels.
       */
      if (state.latestFocusedWorldCoordinates !== null && !selectors.isAnimating(state)(time)) {
        const rasterOfLastFocusedWorldCoordinates = vector2.applyMatrix3(
          state.latestFocusedWorldCoordinates,
          selectors.projectionMatrix(state)(time)
        );
        const newWorldCoordinatesAtLastFocusedPosition = vector2.applyMatrix3(
          rasterOfLastFocusedWorldCoordinates,
          selectors.inverseProjectionMatrix(stateWithNewScaling)(time)
        );

        /**
         * The change in world position incurred by changing scale.
         */
        const delta = vector2.subtract(
          newWorldCoordinatesAtLastFocusedPosition,
          state.latestFocusedWorldCoordinates
        );

        /**
         * Adjust for the change in position due to scale.
         */
        const translationNotCountingCurrentPanning: Vector2 = vector2.subtract(
          stateWithNewScaling.translationNotCountingCurrentPanning,
          delta
        );
        draft[id].camera = {
          ...stateWithNewScaling,
          translationNotCountingCurrentPanning,
        };
      } else {
        draft[id].camera = stateWithNewScaling;
      }
      return draft;
    })
  )
  .withHandling(
    immerCase(userSetPositionOfCamera, (draft, { id, cameraView }) => {
      /**
       * Handle the case where the position of the camera is explicitly set, for example by a 'back to center' feature.
       */
      const state: Draft<CameraState> = draft[id].camera;
      state.animation = undefined;
      state.translationNotCountingCurrentPanning[0] = cameraView[0];
      state.translationNotCountingCurrentPanning[1] = cameraView[1];
      return draft;
    })
  )
  .withHandling(
    immerCase(userStartedPanning, (draft, { id, screenCoordinates, time }) => {
      const state: Draft<CameraState> = draft[id].camera;
      if (selectors.isAnimating(state)(time)) {
        return draft;
      }
      /**
       * When the user begins panning with a mousedown event we mark the starting position for later comparisons.
       */
      state.animation = undefined;
      state.panning = {
        ...state.panning,
        origin: screenCoordinates,
        currentOffset: screenCoordinates,
      };
      return draft;
    })
  )

  .withHandling(
    immerCase(userStoppedPanning, (draft, { id, time }) => {
      /**
       * When the user stops panning (by letting up on the mouse) we calculate the new translation of the camera.
       */
      const state: Draft<CameraState> = draft[id].camera;
      state.translationNotCountingCurrentPanning = selectors.translation(state)(time);
      state.panning = undefined;
      return draft;
    })
  )
  .withHandling(
    immerCase(userNudgedCamera, (draft, { id, direction, time }) => {
      const state: Draft<CameraState> = draft[id].camera;
      /**
       * Nudge less when zoomed in.
       */
      const nudge = vector2.multiply(
        vector2.divide([unitsPerNudge, unitsPerNudge], selectors.scale(state)(time)),
        direction
      );

      draft[id].camera = animatePanning(
        state,
        time,
        vector2.add(state.translationNotCountingCurrentPanning, nudge),
        nudgeAnimationDuration
      );
      return draft;
    })
  )
  .withHandling(
    immerCase(userSetRasterSize, (draft, { id, dimensions }) => {
      /**
       * Handle resizes of the Resolver component. We need to know the size in order to convert between screen
       * and world coordinates.
       */
      draft[id].camera.rasterSize = dimensions;
      return draft;
    })
  )
  .withHandling(
    immerCase(userMovedPointer, (draft, { id, screenCoordinates, time }) => {
      const state: Draft<CameraState> = draft[id].camera;
      let stateWithUpdatedPanning: Draft<CameraState> = draft[id].camera;
      if (state.panning) {
        stateWithUpdatedPanning = {
          ...state,
          panning: {
            origin: state.panning.origin,
            currentOffset: screenCoordinates,
          },
        };
      }
      draft[id].camera = {
        ...stateWithUpdatedPanning,
        /**
         * keep track of the last world coordinates the user moved over.
         * When the scale of the projection matrix changes, we adjust the camera's world transform in order
         * to keep the same point under the pointer.
         * In order to do this, we need to know the position of the mouse when changing the scale.
         */
        latestFocusedWorldCoordinates: vector2.applyMatrix3(
          screenCoordinates,
          selectors.inverseProjectionMatrix(stateWithUpdatedPanning)(time)
        ),
      };
      return draft;
    })
  )
  .build();
