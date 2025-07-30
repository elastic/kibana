/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { sourcererActions, sourcererSelectors } from '../store';
import { SourcererScopeName } from '../store/model';
import { useUserInfo } from '../../detections/components/user_info';
import { timelineSelectors } from '../../timelines/store';
import { TimelineId } from '../../../common/types';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { getScopePatternListSelection } from '../store/helpers';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { createSourcererDataView } from './create_sourcerer_data_view';
import { useDataView } from '../../common/containers/source/use_data_view';
import type { State } from '../../common/store/types';
import { useKibana } from '../../common/lib/kibana';
import { useSourcererDataView } from '.';
import { useSyncSourcererUrlState } from '../../data_view_manager/hooks/use_sync_url_state';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

const defaultInitResult = { browserFields: {} };

export const useInitSourcerer = (
  scopeId:
    | SourcererScopeName.default
    | SourcererScopeName.detections
    | SourcererScopeName.explore = SourcererScopeName.default
) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  /* eslint-disable react-hooks/rules-of-hooks */
  // NOTE: skipping the entire hook on purpose when the new picker is enabled
  // will be removed as part of the cleanup in https://github.com/elastic/security-team/issues/11959
  if (newDataViewPickerEnabled) {
    return defaultInitResult;
  }

  const dispatch = useDispatch();
  const {
    data: { dataViews },
  } = useKibana().services;
  const abortCtrl = useRef(new AbortController());
  const initialTimelineSourcerer = useRef(true);
  const initialDetectionSourcerer = useRef(true);
  const { loading: loadingSignalIndex, isSignalIndexExists, signalIndexName } = useUserInfo();

  useSyncSourcererUrlState(scopeId);

  const signalIndexNameSourcerer = useSelector(sourcererSelectors.signalIndexName);
  const defaultDataView = useSelector(sourcererSelectors.defaultDataView);
  const { addError, addWarning } = useAppToasts();

  useEffect(() => {
    if (defaultDataView.error != null) {
      addWarning({
        title: i18n.translate('xpack.securitySolution.sourcerer.permissions.title', {
          defaultMessage: 'Write role required to generate data',
        }),
        text: i18n.translate('xpack.securitySolution.sourcerer.permissions.toastMessage', {
          defaultMessage:
            'Users with write permission need to access the Elastic Security app to initialize the app source data.',
        }),
      });
    }
  }, [addWarning, defaultDataView.error]);

  const getTimelineSelector = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const activeTimeline = useDeepEqualSelector((state) =>
    getTimelineSelector(state, TimelineId.active)
  );

  const scopeDataViewId = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedDataViewId(state, scopeId);
  });
  const selectedPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedPatterns(state, scopeId);
  });
  const missingPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeMissingPatterns(state, scopeId);
  });

  const kibanaDataViews = useSelector(sourcererSelectors.kibanaDataViews);
  const timelineDataViewId = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedDataViewId(state, SourcererScopeName.timeline);
  });
  const timelineSelectedPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedPatterns(state, SourcererScopeName.timeline);
  });
  const timelineMissingPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeMissingPatterns(state, SourcererScopeName.timeline);
  });
  const timelineSelectedDataView = useMemo(() => {
    return kibanaDataViews.find((dataView) => dataView.id === timelineDataViewId);
  }, [kibanaDataViews, timelineDataViewId]);

  const { indexFieldsSearch } = useDataView();

  /*
   * Note for future engineer:
   * we changed the logic to not fetch all the index fields for every data view on the loading of the app
   * because user can have a lot of them and it can slow down the loading of the app
   * and maybe blow up the memory of the browser. We decided to load this data view on demand,
   * we know that will only have to load this dataview on default and timeline scope.
   * We will use two conditions to see if we need to fetch and initialize the dataview selected.
   * First, we will make sure that we did not already fetch them by using `searchedIds`
   * and then we will init them if selectedPatterns and missingPatterns are empty.
   */
  const searchedIds = useRef<string[]>([]);
  useEffect(() => {
    const activeDataViewIds = [...new Set([scopeDataViewId, timelineDataViewId])];
    activeDataViewIds.forEach((id, i) => {
      if (id != null && id.length > 0 && !searchedIds.current.includes(id)) {
        searchedIds.current = [...searchedIds.current, id];

        const currentScope = i === 0 ? SourcererScopeName.default : SourcererScopeName.timeline;

        const needToBeInit =
          id === scopeDataViewId
            ? selectedPatterns.length === 0 && missingPatterns.length === 0
            : timelineDataViewId === id
            ? timelineMissingPatterns.length === 0 &&
              timelineSelectedDataView?.patternList.length === 0
            : false;

        indexFieldsSearch({
          dataViewId: id,
          scopeId: currentScope,
          needToBeInit,
          ...(needToBeInit && currentScope === SourcererScopeName.timeline
            ? {
                skipScopeUpdate: timelineSelectedPatterns.length > 0,
              }
            : {}),
        });
      }
    });
  }, [
    indexFieldsSearch,
    missingPatterns.length,
    scopeDataViewId,
    selectedPatterns.length,
    timelineDataViewId,
    timelineMissingPatterns.length,
    timelineSelectedDataView,
    timelineSelectedPatterns.length,
  ]);

  // Related to timeline
  useEffect(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      signalIndexNameSourcerer == null &&
      activeTimeline?.savedObjectId == null &&
      initialTimelineSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.timeline,
            signalIndexName,
            true
          ),
        })
      );
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.analyzer,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.analyzer,
            signalIndexName,
            true
          ),
        })
      );
    } else if (
      signalIndexNameSourcerer != null &&
      activeTimeline?.savedObjectId == null &&
      initialTimelineSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialTimelineSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.timeline,
            signalIndexNameSourcerer,
            true
          ),
        })
      );
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.analyzer,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.analyzer,
            signalIndexNameSourcerer,
            true
          ),
        })
      );
    }
  }, [
    activeTimeline?.savedObjectId,
    defaultDataView,
    dispatch,
    loadingSignalIndex,
    signalIndexName,
    signalIndexNameSourcerer,
  ]);
  const { dataViewId, browserFields } = useSourcererDataView(scopeId);

  const updateSourcererDataView = useCallback(
    (newSignalsIndex: string) => {
      const asyncSearch = async (newPatternList: string[]) => {
        abortCtrl.current = new AbortController();

        dispatch(sourcererActions.setSourcererScopeLoading({ loading: true }));

        try {
          const response = await createSourcererDataView({
            body: { patternList: newPatternList },
            signal: abortCtrl.current.signal,
            dataViewService: dataViews,
            dataViewId,
          });

          if (response?.defaultDataView.patternList.includes(newSignalsIndex)) {
            // first time signals is defined and validated in the sourcerer
            // redo indexFieldsSearch
            indexFieldsSearch({ dataViewId: response.defaultDataView.id });
            dispatch(sourcererActions.setSourcererDataViews(response));
          }
          dispatch(sourcererActions.setSourcererScopeLoading({ loading: false }));
        } catch (err) {
          if (err.name === 'AbortError') {
            // the fetch was canceled, we don't need to do anything about it
          } else {
            addError(err, {
              title: i18n.translate('xpack.securitySolution.sourcerer.error.title', {
                defaultMessage: 'Error updating Security Data View',
              }),
              toastMessage: i18n.translate('xpack.securitySolution.sourcerer.error.toastMessage', {
                defaultMessage: 'Refresh the page',
              }),
            });
          }
          dispatch(sourcererActions.setSourcererScopeLoading({ loading: false }));
        }
      };

      if (defaultDataView.title.indexOf(newSignalsIndex) === -1) {
        abortCtrl.current.abort();
        asyncSearch([...defaultDataView.title.split(','), newSignalsIndex]);
      }
    },
    [defaultDataView.title, dispatch, dataViews, dataViewId, indexFieldsSearch, addError]
  );

  const onSignalIndexUpdated = useCallback(() => {
    if (
      !loadingSignalIndex &&
      signalIndexName != null &&
      signalIndexNameSourcerer == null &&
      defaultDataView.id.length > 0
    ) {
      updateSourcererDataView(signalIndexName);
      dispatch(sourcererActions.setSignalIndexName({ signalIndexName }));
    }
  }, [
    defaultDataView.id.length,
    dispatch,
    loadingSignalIndex,
    signalIndexName,
    signalIndexNameSourcerer,
    updateSourcererDataView,
  ]);

  useEffect(() => {
    onSignalIndexUpdated();
    // because we only want onSignalIndexUpdated to run when signalIndexName updates,
    // but we want to know about the updates from the dependencies of onSignalIndexUpdated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalIndexName]);

  // Related to the detection page
  useEffect(() => {
    if (
      scopeId === SourcererScopeName.detections &&
      isSignalIndexExists &&
      signalIndexName != null &&
      initialDetectionSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialDetectionSourcerer.current = false;
      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.detections,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: getScopePatternListSelection(
            defaultDataView,
            SourcererScopeName.detections,
            signalIndexName,
            true
          ),
        })
      );
    } else if (
      scopeId === SourcererScopeName.detections &&
      signalIndexNameSourcerer != null &&
      initialTimelineSourcerer.current &&
      defaultDataView.id.length > 0
    ) {
      initialDetectionSourcerer.current = false;
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.detections,
        selectedDataViewId: defaultDataView.id,
        selectedPatterns: getScopePatternListSelection(
          defaultDataView,
          SourcererScopeName.detections,
          signalIndexNameSourcerer,
          true
        ),
      });
    }
  }, [
    defaultDataView,
    dispatch,
    isSignalIndexExists,
    scopeId,
    signalIndexName,
    signalIndexNameSourcerer,
  ]);

  return useMemo(
    () => ({
      browserFields,
    }),
    [browserFields]
  );
};
