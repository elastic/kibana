/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { matchPath } from 'react-router-dom';

import { getLinksWithHiddenTimeline } from '../../links';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useKibana } from '../../lib/kibana';

const isTimelinePathVisible = (currentPath: string): boolean => {
  const groupLinksWithHiddenTimelinePaths = getLinksWithHiddenTimeline().map((l) => l.path);
  const hiddenTimelineRoutes = groupLinksWithHiddenTimelinePaths;
  return !hiddenTimelineRoutes.find((route) => matchPath(currentPath, route));
};

export const useShowTimelineForGivenPath = () => {
  const { indicesExist, dataViewId } = useSourcererDataView(SourcererScopeName.timeline);
  const userHasSecuritySolutionVisible = useKibana().services.application.capabilities.siem.show;

  const isTimelineAllowed = useMemo(
    () => userHasSecuritySolutionVisible && (indicesExist || dataViewId === null),
    [indicesExist, dataViewId, userHasSecuritySolutionVisible]
  );

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
