/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { InputsModelId } from '../../store/inputs/constants';
import { SCROLLING_DISABLED_CLASS_NAME } from '../../../../common/constants';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { inputsActions } from '../../store/actions';

export interface GlobalFullScreen {
  globalFullScreen: boolean;
  setGlobalFullScreen: (fullScreen: boolean) => void;
}

export interface TimelineFullScreen {
  timelineFullScreen: boolean;
  setTimelineFullScreen: (fullScreen: boolean) => void;
}

export const useGlobalFullScreen = (): GlobalFullScreen => {
  const dispatch = useDispatch();
  const globalFullScreen =
    useShallowEqualSelector(inputsSelectors.globalFullScreenSelector) ?? false;
  const setGlobalFullScreen = useCallback(
    (fullScreen: boolean) => {
      const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
      if (fullScreen) {
        document.body.classList.add(SCROLLING_DISABLED_CLASS_NAME, 'euiDataGrid__restrictBody');
      } else if (isDataGridFullScreen === false || fullScreen === false) {
        document.body.classList.remove(SCROLLING_DISABLED_CLASS_NAME, 'euiDataGrid__restrictBody');
      }

      dispatch(inputsActions.setFullScreen({ id: InputsModelId.global, fullScreen }));
    },
    [dispatch]
  );
  const memoizedReturn = useMemo(
    () => ({
      globalFullScreen,
      setGlobalFullScreen,
    }),
    [globalFullScreen, setGlobalFullScreen]
  );

  return memoizedReturn;
};

export const useTimelineFullScreen = (): TimelineFullScreen => {
  const dispatch = useDispatch();
  const timelineFullScreen =
    useShallowEqualSelector(inputsSelectors.timelineFullScreenSelector) ?? false;
  const setTimelineFullScreen = useCallback(
    (fullScreen: boolean) => {
      const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
      if (fullScreen) {
        document.body.classList.add('euiDataGrid__restrictBody');
      } else if (isDataGridFullScreen === false || fullScreen === false) {
        document.body.classList.remove('euiDataGrid__restrictBody');
      }
      dispatch(inputsActions.setFullScreen({ id: InputsModelId.timeline, fullScreen }));
    },
    [dispatch]
  );
  const memoizedReturn = useMemo(
    () => ({
      timelineFullScreen,
      setTimelineFullScreen,
    }),
    [timelineFullScreen, setTimelineFullScreen]
  );
  return memoizedReturn;
};

/**
 * Checks to see if there is a EUI Data Grid in full screen mode in the document tree
 */
export const useHasDataGridFullScreen = (): boolean => {
  const [isDataGridFullScreen, setIsDataGridFullScreen] = useState(false);

  useEffect(() => {
    const observeTarget = document.body;
    const docBodyObserver = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.attributeName === 'class') {
          setIsDataGridFullScreen(observeTarget.classList.contains('euiDataGrid__restrictBody'));
        }
      }
    });

    docBodyObserver.observe(observeTarget, { attributes: true });

    return () => docBodyObserver.disconnect();
  }, []);

  return isDataGridFullScreen;
};

/**
 * Checks to see if any content (ex. timeline, global or data grid) is
 * currently being displayed in full screen mode
 */
export const useHasFullScreenContent = (): boolean => {
  const { globalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen } = useTimelineFullScreen();
  const dataGridFullScreen = useHasDataGridFullScreen();

  return globalFullScreen || timelineFullScreen || dataGridFullScreen;
};
