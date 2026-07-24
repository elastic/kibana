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
import { loadDataViewFields } from '../utils/load_data_view_fields';
import { useKibana } from '../../common/lib/kibana';
import { getScopeFromPath } from '../../sourcerer/containers/sourcerer_paths';

/**
 * Lazily loads the explore data view fields when the user lands on an explore page.
 *
 * This hook is a no-op unless the user is on an explore page (Hosts, Users, Network). The explore
 * data view is normally created ahead of time by the init listener with `skipFetchFields:true`, so
 * that broad index patterns don't trigger expensive `_field_caps` requests on unrelated pages such
 * as Alerts or Dashboards. When the user actually navigates to an explore page, this hook:
 * - refreshes the fields on the already-registered explore data view (the common path), or
 * - creates the explore data view from scratch as a fallback, if the init listener's eager
 *   creation failed.
 *
 * On success the refreshed/created data view is dispatched to the store and selected for the
 * explore scope. On failure the platform's own "Error fetching fields" toast is shown (via
 * `refreshFields` with `displayErrors` defaulting to `true`) — no additional handling is needed.
 */
export const useInitExploreDataView = (): void => {
  const {
    services: { dataViews, spaces },
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
        if (exploreDataViewId) {
          // The init listener created the DV with skipFetchFields:true — refresh fields now
          // that we know the user is on an explore page and actually needs them. Returns null
          // (a no-op) if the fields are already populated, e.g. the user revisited the page.
          const refreshedDV = await loadDataViewFields(dataViews, exploreDataViewId);
          if (refreshedDV) {
            dispatch(sharedDataViewManagerSlice.actions.addDataView(refreshedDV));
            dispatch(selectDataViewAsync({ id: refreshedDV.id, scope: PageScope.explore }));
          }
        } else {
          // Init listener failed to register the explore DV — create from scratch.
          const exploreDataView = await createExploreDataView(
            { dataViews, spaces },
            defaultDataViewTitle.split(','),
            alertDataViewTitle
          );

          dispatch(sharedDataViewManagerSlice.actions.addDataView(exploreDataView));
          dispatch(selectDataViewAsync({ id: exploreDataView.id, scope: PageScope.explore }));
        }

        // NOTE: intentionally leave `isInitializingRef` set on success. The explore scope
        // selection is applied asynchronously (via the `selectDataViewAsync` listener), so
        // `exploreDataViewId` is not yet populated at this point. Keeping the guard set
        // prevents a re-render (e.g. triggered by `addDataView` updating the shared state)
        // from creating and dispatching a duplicate explore data view.
      } catch {
        // Allow a retry on the next dependency change if field loading failed.
        // The platform's own toast (shown by refreshFields) is the user-facing feedback.
        isInitializingRef.current = false;
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
    dispatch,
  ]);
};
