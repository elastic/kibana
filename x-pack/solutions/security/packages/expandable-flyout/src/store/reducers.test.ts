/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlyoutPanelProps } from '../types';
import { panelsReducer, uiReducer } from './reducers';
import { initialPanelsState, initialUiState, PanelsState, UiState } from './state';
import {
  changePushVsOverlayAction,
  changeUserCollapsedWidthAction,
  changeUserExpandedWidthAction,
  changeUserSectionWidthsAction,
  closeLeftPanelAction,
  closePanelsAction,
  closePreviewPanelAction,
  closeRightPanelAction,
  openLeftPanelAction,
  openPanelsAction,
  openPreviewPanelAction,
  openRightPanelAction,
  previousPreviewPanelAction,
  resetAllUserChangedWidthsAction,
  setDefaultWidthsAction,
} from './actions';

const id1 = 'id1';
const id2 = 'id2';
const rightPanel1: FlyoutPanelProps = {
  id: 'right1',
  path: { tab: 'tab' },
};
const leftPanel1: FlyoutPanelProps = {
  id: 'left1',
  params: { id: 'id' },
};
const previewPanel1: FlyoutPanelProps = {
  id: 'preview1',
  params: { id: 'id' },
};

const rightPanel2: FlyoutPanelProps = {
  id: 'right2',
  path: { tab: 'tab' },
};
const leftPanel2: FlyoutPanelProps = {
  id: 'left2',
  params: { id: 'id' },
};
const previewPanel2: FlyoutPanelProps = {
  id: 'preview2',
  params: { id: 'id' },
};

describe('panelsReducer', () => {
  describe('should handle openFlyout action', () => {
    it('should add panels to empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = openPanelsAction({
        right: rightPanel1,
        left: leftPanel1,
        preview: previewPanel1,
        id: id1,
      });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should override all panels in the state and update history', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1, { id: 'preview' }],
            history: [rightPanel1],
          },
        },
      };
      const action = openPanelsAction({
        right: rightPanel2,
        left: leftPanel2,
        preview: previewPanel2,
        id: id1,
      });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel2,
            right: rightPanel2,
            preview: [previewPanel2],
            history: [rightPanel1, rightPanel2],
          },
        },
        needsSync: true,
      });
    });

    it('should remove all panels despite only passing a single section ', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = openPanelsAction({
        right: rightPanel2,
        id: id1,
      });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel2,
            preview: undefined,
            history: [rightPanel1, rightPanel2],
          },
        },
        needsSync: true,
      });
    });

    it('should add panels to a new key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = openPanelsAction({
        right: rightPanel2,
        id: id2,
      });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
          [id2]: {
            left: undefined,
            right: rightPanel2,
            preview: undefined,
            history: [rightPanel2],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle openRightPanel action', () => {
    it('should add right panel to empty state but does not update history', () => {
      const state: PanelsState = initialPanelsState;
      const action = openRightPanelAction({ right: rightPanel1, id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel1,
            preview: undefined,
            history: [],
          },
        },
        needsSync: true,
      });
    });

    it('should replace right panel but does not update history', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = openRightPanelAction({ right: rightPanel2, id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel2,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should add right panel to a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = openRightPanelAction({ right: rightPanel2, id: id2 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
          [id2]: {
            left: undefined,
            right: rightPanel2,
            preview: undefined,
            history: [],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle openLeftPanel action', () => {
    it('should add left panel to empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = openLeftPanelAction({ left: leftPanel1, id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: undefined,
            preview: undefined,
            history: [],
          },
        },
        needsSync: true,
      });
    });

    it('should replace only left panel', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [],
          },
        },
      };
      const action = openLeftPanelAction({ left: leftPanel2, id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel2,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [],
          },
        },
        needsSync: true,
      });
    });

    it('should add left panel to a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [],
          },
        },
      };
      const action = openLeftPanelAction({ left: leftPanel2, id: id2 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [],
          },
          [id2]: {
            left: leftPanel2,
            right: undefined,
            preview: undefined,
            history: [],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle openPreviewPanel action', () => {
    it('should add preview panel to empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = openPreviewPanelAction({ preview: previewPanel1, id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: undefined,
            preview: [previewPanel1],
            history: [],
          },
        },
        needsSync: true,
      });
    });

    it('should add preview panel to the list of preview panels', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [],
          },
        },
      };
      const action = openPreviewPanelAction({ preview: previewPanel2, id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1, previewPanel2],
            history: [],
          },
        },
        needsSync: true,
      });
    });

    it('should add preview panel to a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [],
          },
        },
      };
      const action = openPreviewPanelAction({ preview: previewPanel2, id: id2 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [],
          },
          [id2]: {
            left: undefined,
            right: undefined,
            preview: [previewPanel2],
            history: [],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle closeRightPanel action', () => {
    it('should return empty state when removing right panel from empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = closeRightPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...state,
        needsSync: true,
      });
    });

    it(`should return unmodified state when removing right panel when no right panel exist`, () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: undefined,
            preview: [previewPanel1],
            history: [],
          },
        },
      };
      const action = closeRightPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...state,
        needsSync: true,
      });
    });

    it('should remove right panel', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closeRightPanelAction({ id: id1 });

      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: undefined,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should not remove right panel for a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closeRightPanelAction({ id: id2 });

      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle closeLeftPanel action', () => {
    it('should return empty state when removing left panel on empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = closeLeftPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...state,
        needsSync: true,
      });
    });

    it(`should return unmodified state when removing left panel when no left panel exist`, () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closeLeftPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...state,
        needsSync: true,
      });
    });

    it('should remove left panel', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closeLeftPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should not remove left panel for a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closeLeftPanelAction({ id: id2 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle closePreviewPanel action', () => {
    it('should return empty state when removing preview panel on empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = closePreviewPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...state,
        needsSync: true,
      });
    });

    it(`should return unmodified state when removing preview panel when no preview panel exist`, () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: undefined,
            history: [rightPanel1],
          },
        },
      };
      const action = closePreviewPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...state,
        needsSync: true,
      });
    });

    it('should remove all preview panels', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: rightPanel1,
            right: leftPanel1,
            preview: [previewPanel1, previewPanel2],
            history: [rightPanel1],
          },
        },
      };
      const action = closePreviewPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: rightPanel1,
            right: leftPanel1,
            preview: undefined,
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should not remove preview panels for a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closePreviewPanelAction({ id: id2 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle previousPreviewPanel action', () => {
    it('should return empty state when previous preview panel on an empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = previousPreviewPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...initialPanelsState,
        needsSync: false,
      });
    });

    it(`should return unmodified state when previous preview panel when no preview panel exist`, () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: undefined,
            history: [rightPanel1],
          },
        },
      };
      const action = previousPreviewPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...state,
        needsSync: false,
      });
    });

    it('should remove only last preview panel', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1, previewPanel2],
            history: [rightPanel1],
          },
        },
      };
      const action = previousPreviewPanelAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: false,
      });
    });

    it('should not remove the last preview panel for a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = previousPreviewPanelAction({ id: id2 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: false,
      });
    });
  });

  describe('should handle closeFlyout action', () => {
    it('should return empty state when closing flyout on an empty state', () => {
      const state: PanelsState = initialPanelsState;
      const action = closePanelsAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        ...initialPanelsState,
        needsSync: true,
      });
    });

    it('should remove all panels', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closePanelsAction({ id: id1 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: undefined,
            preview: undefined,
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should not remove panels for a different key', () => {
      const state: PanelsState = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
      };
      const action = closePanelsAction({ id: id2 });
      const newState: PanelsState = panelsReducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
            history: [rightPanel1],
          },
        },
        needsSync: true,
      });
    });
  });
});

describe('uiReducer', () => {
  describe('should handle changePushVsOverlayAction action', () => {
    it('should set value if id does not exist', () => {
      const state: UiState = initialUiState;
      const action = changePushVsOverlayAction({
        type: 'push',
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        pushVsOverlay: 'push',
      });
    });

    it('should override value if id already exists', () => {
      const state: UiState = {
        ...initialUiState,
        pushVsOverlay: 'push',
      };
      const action = changePushVsOverlayAction({
        type: 'overlay',
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        pushVsOverlay: 'overlay',
      });
    });
  });

  describe('should handle setDefaultWidthsAction action', () => {
    it('should set value state is empty', () => {
      const state: UiState = initialUiState;
      const action = setDefaultWidthsAction({
        rightOverlay: 300,
        leftOverlay: 900,
        previewOverlay: 300,
        rightPush: 200,
        leftPush: 600,
        previewPush: 200,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        defaultWidths: {
          overlay: {
            rightWidth: 300,
            leftWidth: 900,
            previewWidth: 300,
            rightPercentage: 25,
            leftPercentage: 75,
            previewPercentage: 25,
          },
          push: {
            rightWidth: 200,
            leftWidth: 600,
            previewWidth: 200,
            rightPercentage: 25,
            leftPercentage: 75,
            previewPercentage: 25,
          },
        },
      });
    });

    it('should override value if state not empty', () => {
      const state: UiState = {
        ...initialUiState,
        defaultWidths: {
          overlay: {
            rightWidth: 300,
            leftWidth: 900,
            previewWidth: 300,
            rightPercentage: 25,
            leftPercentage: 75,
            previewPercentage: 25,
          },
          push: {
            rightWidth: 200,
            leftWidth: 600,
            previewWidth: 200,
            rightPercentage: 25,
            leftPercentage: 75,
            previewPercentage: 25,
          },
        },
      };
      const action = setDefaultWidthsAction({
        rightOverlay: 500,
        leftOverlay: 500,
        previewOverlay: 500,
        rightPush: 500,
        leftPush: 500,
        previewPush: 500,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        defaultWidths: {
          overlay: {
            rightWidth: 500,
            leftWidth: 500,
            previewWidth: 500,
            rightPercentage: 50,
            leftPercentage: 50,
            previewPercentage: 50,
          },
          push: {
            rightWidth: 500,
            leftWidth: 500,
            previewWidth: 500,
            rightPercentage: 50,
            leftPercentage: 50,
            previewPercentage: 50,
          },
        },
      });
    });
  });

  describe('should handle changeUserCollapsedWidthAction action', () => {
    it('should set value state is empty', () => {
      const state: UiState = initialUiState;
      const action = changeUserCollapsedWidthAction({
        width: 200,
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userFlyoutWidths: {
          collapsedWidth: 200,
        },
      });
    });

    it('should override value if state not empty', () => {
      const state: UiState = {
        ...initialUiState,
        userFlyoutWidths: {
          collapsedWidth: 200,
          expandedWidth: 500,
        },
      };
      const action = changeUserCollapsedWidthAction({
        width: 250,
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userFlyoutWidths: {
          collapsedWidth: 250,
          expandedWidth: 500,
        },
      });
    });
  });

  describe('should handle changeUserExpandedWidthAction action', () => {
    it('should set value state is empty', () => {
      const state: UiState = initialUiState;
      const action = changeUserExpandedWidthAction({
        width: 500,
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userFlyoutWidths: {
          expandedWidth: 500,
        },
      });
    });

    it('should override value if state not empty', () => {
      const state: UiState = {
        ...initialUiState,
        userFlyoutWidths: {
          collapsedWidth: 200,
          expandedWidth: 500,
        },
      };
      const action = changeUserExpandedWidthAction({
        width: 1000,
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userFlyoutWidths: {
          collapsedWidth: 200,
          expandedWidth: 1000,
        },
      });
    });
  });

  describe('should handle changeUserSectionWidthsAction action', () => {
    it('should set value state is empty', () => {
      const state: UiState = initialUiState;
      const action = changeUserSectionWidthsAction({
        right: 50,
        left: 50,
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userSectionWidths: {
          leftPercentage: 50,
          rightPercentage: 50,
        },
      });
    });

    it('should override value if state not empty', () => {
      const state: UiState = {
        ...initialUiState,
        userSectionWidths: {
          leftPercentage: 50,
          rightPercentage: 50,
        },
      };
      const action = changeUserSectionWidthsAction({
        right: 30,
        left: 70,
        savedToLocalStorage: false,
      });
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userSectionWidths: {
          leftPercentage: 70,
          rightPercentage: 30,
        },
      });
    });
  });

  describe('should handle resetAllUserChangedWidthsAction action', () => {
    it('should set value state is empty', () => {
      const state: UiState = initialUiState;
      const action = resetAllUserChangedWidthsAction();
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userSectionWidths: {
          leftPercentage: undefined,
          rightPercentage: undefined,
        },
        userFlyoutWidths: {
          collapsedWidth: undefined,
          expandedWidth: undefined,
        },
      });
    });

    it('should override value if state not empty', () => {
      const state: UiState = {
        ...initialUiState,
        userFlyoutWidths: {
          collapsedWidth: 200,
          expandedWidth: 500,
        },
        userSectionWidths: {
          leftPercentage: 50,
          rightPercentage: 50,
        },
      };
      const action = resetAllUserChangedWidthsAction();
      const newState: UiState = uiReducer(state, action);

      expect(newState).toEqual({
        ...state,
        userSectionWidths: {
          leftPercentage: undefined,
          rightPercentage: undefined,
        },
        userFlyoutWidths: {
          collapsedWidth: undefined,
          expandedWidth: undefined,
        },
      });
    });
  });
});
