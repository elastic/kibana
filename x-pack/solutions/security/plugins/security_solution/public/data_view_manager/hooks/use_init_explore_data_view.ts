/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { useLocation } from 'react-router-dom';
import { PageScope } from '../constants';
import { sourcererAdapterSelector, sharedStateSelector } from '../redux/selectors';
import { sharedDataViewManagerSlice } from '../redux/slices';
import { selectDataViewAsync } from '../redux/actions';
import { createExploreDataView } from '../utils/create_explore_data_view';
import { useKibana } from '../../common/lib/kibana';
import { getScopeFromPath } from '../../sourcerer/containers/sourcerer_paths';

/**
 * Lazily initializes the explore data view scope.
 *
 * This hook is a no-op when the user is not on an explore page (Hosts, Users, Network). When the
 * user is on an explore page and the explore scope has not yet been initialized, it creates the
 * explore data view from the default data view patterns and dispatches the scope selection.
 *
 * This avoids fetching large _field_caps responses for broad index patterns on unrelated
 * pages such as Alerts or Dashboards.
 */
export const useInitExploreDataView = (): void => {
  const {
    services: { dataViews, spaces, notifications },
  } = useKibana();

  const { pathname } = useLocation();
  const isExplorePath = getScopeFromPath(pathname) === PageScope.explore;

  const dispatch = useDispatch();
  const { dataViewId: exploreDataViewId } = useSelector(
    sourcererAdapterSelector(PageScope.explore)
  );
  const {
    defaultDataViewId,
    alertDataViewId,
    dataViews: dataViewSpecs,
    status,
  } = useSelector(sharedStateSelector);

  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (!isExplorePath) {
      return;
    }

    // Already initialized
    if (exploreDataViewId) {
      return;
    }

    // Shared state not ready yet — default/alert DV IDs not available
    if (status !== 'ready' || !defaultDataViewId || !alertDataViewId) {
      return;
    }

    // Prevent concurrent init attempts
    if (isInitializingRef.current) {
      return;
    }

    const defaultDataViewTitle = dataViewSpecs.find((dv) => dv.id === defaultDataViewId)?.title;
    const alertDataViewTitle = dataViewSpecs.find((dv) => dv.id === alertDataViewId)?.title;

    if (!defaultDataViewTitle || !alertDataViewTitle) {
      return;
    }

    isInitializingRef.current = true;

    (async () => {
      try {
        const exploreDataView = await createExploreDataView(
          { dataViews, spaces },
          defaultDataViewTitle.split(','),
          alertDataViewTitle
        );

        dispatch(sharedDataViewManagerSlice.actions.addDataView(exploreDataView));
        dispatch(selectDataViewAsync({ id: exploreDataView.id, scope: PageScope.explore }));

        // NOTE: intentionally leave `isInitializingRef` set on success. The explore scope
        // selection is applied asynchronously (via the `selectDataViewAsync` listener), so
        // `exploreDataViewId` is not yet populated at this point. Keeping the guard set
        // prevents a re-render (e.g. triggered by `addDataView` updating the shared state)
        // from creating and dispatching a duplicate explore data view.
      } catch (error: unknown) {
        // Allow a retry on the next dependency change if creation failed.
        isInitializingRef.current = false;
        notifications.toasts.addDanger({
          title: 'Error initializing the explore data view',
          text: `Error: ${error instanceof Error ? error.message : 'unknown'}`,
        });
      }
    })();
  }, [
    isExplorePath,
    exploreDataViewId,
    status,
    defaultDataViewId,
    alertDataViewId,
    dataViewSpecs,
    dataViews,
    spaces,
    notifications,
    dispatch,
  ]);
};
