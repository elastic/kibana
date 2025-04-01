/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';
import { useWithCaseDetailsRefresh } from '../../../../common/components/endpoint';

interface State {
  isolateAction: 'isolateHost' | 'unisolateHost';
  isHostIsolationPanelOpen: boolean;
  isIsolateActionSuccessBannerVisible: boolean;
}

const initialState: State = {
  isolateAction: 'isolateHost',
  isHostIsolationPanelOpen: false,
  isIsolateActionSuccessBannerVisible: false,
};

type HostIsolationActions =
  | {
      type: 'setIsHostIsolationPanel';
      isHostIsolationPanelOpen: boolean;
    }
  | {
      type: 'setIsolateAction';
      isolateAction: 'isolateHost' | 'unisolateHost';
    }
  | {
      type: 'setIsIsolateActionSuccessBannerVisible';
      isIsolateActionSuccessBannerVisible: boolean;
    };

function reducer(state: State, action: HostIsolationActions) {
  switch (action.type) {
    case 'setIsolateAction':
      return { ...state, isolateAction: action.isolateAction };
    case 'setIsHostIsolationPanel':
      return { ...state, isHostIsolationPanelOpen: action.isHostIsolationPanelOpen };
    case 'setIsIsolateActionSuccessBannerVisible':
      return {
        ...state,
        isIsolateActionSuccessBannerVisible: action.isIsolateActionSuccessBannerVisible,
      };
    default:
      throw new Error();
  }
}

export interface UseHostIsolationResult {
  /**
   * The action to take on the host
   */
  isolateAction: 'isolateHost' | 'unisolateHost';
  /**
   * True if the host isolation panel is open in the flyout
   */
  isHostIsolationPanelOpen: boolean;
  /**
   * True if the isolate action was successful and the banner should be displayed
   */
  isIsolateActionSuccessBannerVisible: boolean;
  /**
   * Callback to handle the success of the isolation action
   */
  handleIsolationActionSuccess: () => void;
  /**
   * Callback to show the host isolation panel in the flyout
   */
  showHostIsolationPanel: (action: 'isolateHost' | 'unisolateHost' | undefined) => void;
  /**
   * Callback to show the alert details in the flyout
   */
  showAlertDetails: () => void;
}

/**
 * Hook that returns the information for a parent to render the host isolation panel in the flyout
 */
export const useHostIsolation = (): UseHostIsolationResult => {
  const [
    { isolateAction, isHostIsolationPanelOpen, isIsolateActionSuccessBannerVisible },
    dispatch,
  ] = useReducer(reducer, initialState);

  const showAlertDetails = useCallback(() => {
    dispatch({ type: 'setIsHostIsolationPanel', isHostIsolationPanelOpen: false });
    dispatch({
      type: 'setIsIsolateActionSuccessBannerVisible',
      isIsolateActionSuccessBannerVisible: false,
    });
  }, []);

  const showHostIsolationPanel = useCallback(
    (action: 'isolateHost' | 'unisolateHost' | undefined) => {
      if (action === 'isolateHost' || action === 'unisolateHost') {
        dispatch({ type: 'setIsHostIsolationPanel', isHostIsolationPanelOpen: true });
        dispatch({ type: 'setIsolateAction', isolateAction: action });
      }
    },
    []
  );

  const caseDetailsRefresh = useWithCaseDetailsRefresh();

  const handleIsolationActionSuccess = useCallback(() => {
    dispatch({
      type: 'setIsIsolateActionSuccessBannerVisible',
      isIsolateActionSuccessBannerVisible: true,
    });

    // If a case details refresh ref is defined, then refresh actions and comments
    if (caseDetailsRefresh) {
      caseDetailsRefresh.refreshCase();
    }
  }, [caseDetailsRefresh]);

  return useMemo(
    () => ({
      isolateAction,
      isHostIsolationPanelOpen,
      isIsolateActionSuccessBannerVisible,
      handleIsolationActionSuccess,
      showAlertDetails,
      showHostIsolationPanel,
    }),
    [
      isolateAction,
      isHostIsolationPanelOpen,
      isIsolateActionSuccessBannerVisible,
      handleIsolationActionSuccess,
      showAlertDetails,
      showHostIsolationPanel,
    ]
  );
};
