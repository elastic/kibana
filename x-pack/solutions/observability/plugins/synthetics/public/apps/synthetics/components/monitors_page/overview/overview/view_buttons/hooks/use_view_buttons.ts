/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  DEFAULT_OVERVIEW_VIEW,
  OverviewView,
  isOverviewView,
  selectOverviewState,
  setOverviewViewAction,
} from '../../../../../../state';
import { useUrlParams } from '../../../../../../hooks';

export const useViewButtons = () => {
  const isInitialMount = useRef(true);

  const { view } = useSelector(selectOverviewState);
  const [urlParams, updateUrlParams] = useUrlParams();

  const { view: urlView } = urlParams();

  const [localStorageView, setLocalStorageView] = useLocalStorage<OverviewView>(
    'synthetics.overviewView',
    urlView || view
  );
  const dispatch = useDispatch();

  if (isInitialMount.current) {
    // When the component mounts, check if there is a view in the URL first
    if (urlView) {
      dispatch(setOverviewViewAction(urlView));
    } // If there is no view in the URL, check if there is a view in local storage that is not the default view
    else if (localStorageView && localStorageView !== DEFAULT_OVERVIEW_VIEW) {
      dispatch(setOverviewViewAction(localStorageView));
      updateUrlParams({ view: localStorageView });
    }
    isInitialMount.current = false;
  }

  const onChangeView = (id: string) => {
    if (!isOverviewView(id)) {
      throw new Error(`Invalid view: ${id}, this should never happen`);
    }
    dispatch(setOverviewViewAction(id));
    updateUrlParams({ view: id === DEFAULT_OVERVIEW_VIEW ? undefined : id });
    setLocalStorageView(id);
  };

  return { view, onChangeView };
};
