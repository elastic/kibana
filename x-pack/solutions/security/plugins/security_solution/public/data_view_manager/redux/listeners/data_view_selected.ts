/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import type { DataView, DataViewLazy, DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { AnyAction, Dispatch, ListenerEffectAPI } from '@reduxjs/toolkit';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { isEmpty } from 'lodash';
import type { Logger } from '@kbn/logging';
import type { RootState } from '../reducer';
import { scopes } from '../reducer';
import { selectDataViewAsync } from '../actions';
import { sharedDataViewManagerSlice } from '../slices';
import { PageScope } from '../../constants';

/**
 * Creates a Redux listener for handling data view selection logic in the data view manager.
 *
 * This listener responds to the `selectDataViewAsync` action for a specific scope. It attempts to resolve
 * the selected data view by:
 *   1. Checking for a cached data view (either ad-hoc or persisted) in the Redux state.
 *   2. If not found, attempting to fetch a lazy data view by ID from the DataViews service.
 *   3. If still not found, creating a new ad-hoc data view using fallback patterns.
 *
 * The listener ensures that only one effect runs per scope at a time to prevent race conditions.
 * If a data view is successfully resolved, it dispatches an action to set it as selected for the current scope.
 * If an error occurs during fetching or creation, it dispatches an error action for the current scope.
 *
 * @param dependencies - The dependencies required for the listener, including the scope, DataViews service, and storage.
 * @returns An object with the action creator and effect for Redux middleware.
 */
export const createDataViewSelectedListener = (dependencies: {
  scope: PageScope;
  dataViews: DataViewsServicePublic;
  storage: Storage;
  logger: Logger;
}) => {
  return {
    actionCreator: selectDataViewAsync,
    effect: async (
      action: ReturnType<typeof selectDataViewAsync>,
      listenerApi: ListenerEffectAPI<RootState, Dispatch<AnyAction>>
    ) => {
      const logger = dependencies.logger;
      logger.debug(
        `Data view selection requested for scope: ${
          dependencies.scope
        } with payload: ${JSON.stringify(action.payload)}`
      );
      if (dependencies.scope !== action.payload.scope) {
        return;
      }

      // Cancel effects running for the current scope to prevent race conditions
      listenerApi.cancelActiveListeners();

      logger.debug(`cancelActiveListeners called for scope: ${dependencies.scope}`);

      let dataViewByIdError: unknown;
      let adhocDataViewCreationError: unknown;
      let dataViewById: DataViewLazy | null = null;
      let adHocDataView: DataView | null = null;

      const state = listenerApi.getState();

      const findCachedDataView = (id: string | null | undefined) => {
        if (!id) {
          return null;
        }

        const cachedAdHocDataView =
          state.dataViewManager.shared.adhocDataViews.find((dv) => dv.id === id) ?? null;

        const cachedPersistedDataView =
          state.dataViewManager.shared.dataViews.find((dv) => dv.id === id) ?? null;

        const cachedDataView = cachedAdHocDataView || cachedPersistedDataView;

        // NOTE: validate if fields are available, otherwise dont return the view
        // This is required to compute browserFields later.
        // If the view is not returned here, it will be fetched further down this file, and that
        // should return the full data view.
        if (cachedDataView === cachedPersistedDataView && isEmpty(cachedDataView?.fields)) {
          return null;
        }

        return cachedDataView;
      };

      /**
       * Try to locate the data view in cached entries first
       */
      const cachedDataViewSpec = findCachedDataView(action.payload.id);

      logger.debug(
        `Cached data view lookup for id: ${action.payload.id} returned: ${
          cachedDataViewSpec?.title ?? 'null'
        }`
      );

      if (!cachedDataViewSpec) {
        try {
          if (action.payload.id) {
            dataViewById = await dependencies.dataViews.getDataViewLazy(action.payload.id);
          }
        } catch (error: unknown) {
          logger.error(`Error fetching data view by id ${action.payload.id}: ${error}`);
          dataViewByIdError = error;
        }
      }

      if (!dataViewById) {
        logger.debug(`Data view by id lookup failed for id: ${action.payload.id}`);
        try {
          const title = action.payload.fallbackPatterns?.join(',') ?? '';
          if (!title.length) {
            throw new Error('empty adhoc title field');
          }

          adHocDataView = await dependencies.dataViews.create({
            id: `adhoc_${title}`,
            title,
          });
          logger.debug(`Ad-hoc data view created with title: ${title}`);
          if (adHocDataView) {
            listenerApi.dispatch(sharedDataViewManagerSlice.actions.addDataView(adHocDataView));
          }
        } catch (error: unknown) {
          logger.error(`Error creating ad-hoc data view: ${error}`);
          adhocDataViewCreationError = error;
        }
      }

      const resolvedIdToUse =
        cachedDataViewSpec?.id ||
        dataViewById?.id ||
        adHocDataView?.id ||
        // WARN: added this because some of the e2e tests, such as
        // x-pack/test/security_solution_cypress/cypress/e2e/detection_response/detection_engine/rule_creation/indicator_match_rule.cy.ts
        // seem to depend on this, not sure if we want it.
        state.dataViewManager.shared.defaultDataViewId;

      logger.debug(
        `Data view resolved id to use for scope ${dependencies.scope}: ${resolvedIdToUse ?? 'null'}`
      );

      const currentScopeActions = scopes[action.payload.scope].actions;
      if (resolvedIdToUse) {
        // NOTE: this skips data view selection if an override selection
        // has been dispatched
        if (listenerApi.signal.aborted) {
          logger.debug(`Data view selection aborted for scope: ${dependencies.scope}`);
          return;
        }

        logger.debug(`Setting selected data view for scope: ${dependencies.scope}`);
        listenerApi.dispatch(currentScopeActions.setSelectedDataView(resolvedIdToUse));
        if (action.payload.scope === PageScope.analyzer) {
          dependencies.storage.set(
            `securitySolution.dataViewManager.selectedDataView.${action.payload.scope}`,
            resolvedIdToUse
          );
        }
      } else if (dataViewByIdError || adhocDataViewCreationError) {
        logger.error(
          `Data view selection error for scope ${dependencies.scope}: ${
            dataViewByIdError || adhocDataViewCreationError
          }`
        );
        const err = dataViewByIdError || adhocDataViewCreationError;
        listenerApi.dispatch(
          currentScopeActions.dataViewSelectionError(
            `An error occured when setting data view: ${err}`
          )
        );
      }
    },
  };
};
