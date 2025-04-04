/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { matchPath } from 'react-router-dom';

import { getLinksWithHiddenTimeline } from '../../links';
import { useKibana } from '../../lib/kibana';
import { hasAccessToSecuritySolution } from '../../../helpers_access';

import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useEnableExperimental } from '../../hooks/use_experimental_features';

const isTimelinePathVisible = (currentPath: string): boolean => {
  const groupLinksWithHiddenTimelinePaths = getLinksWithHiddenTimeline().map((l) => l.path);
  const hiddenTimelineRoutes = groupLinksWithHiddenTimelinePaths;
  return !hiddenTimelineRoutes.find((route) => matchPath(currentPath, route));
};

export const useShowTimelineForGivenPath = () => {
  const {
    services: {
      application: { capabilities },
    },
  } = useKibana();
  const userHasSecuritySolutionVisible = hasAccessToSecuritySolution(capabilities);

  const { indicesExist, dataViewId } = useSourcererDataView(SourcererScopeName.timeline);

  const { newDataViewPickerEnabled } = useEnableExperimental();

  const isTimelineAllowed = useMemo(() => {
    // NOTE: with new Data View Picker, data view is always defined
    if (newDataViewPickerEnabled) {
      return userHasSecuritySolutionVisible;
    }

    return userHasSecuritySolutionVisible && (indicesExist || dataViewId === null);
  }, [newDataViewPickerEnabled, userHasSecuritySolutionVisible, indicesExist, dataViewId]);

  const getIsTimelineVisible = useCallback(
    (pathname: string) => {
      if (!isTimelineAllowed) {
        return false;
      }
      return isTimelinePathVisible(pathname);
    },
    [isTimelineAllowed]
  );

  return getIsTimelineVisible;
};
