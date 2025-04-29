/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { matchPath } from 'react-router-dom';

import type { NormalizedLink } from '../../links';
import { useNormalizedAppLinks } from '../../links/links_hooks';
import { useKibana } from '../../lib/kibana';
import { hasAccessToSecuritySolution } from '../../../helpers_access';

import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

const useHiddenTimelineRoutes = () => {
  const normalizedLinks = useNormalizedAppLinks();
  const hiddenTimelineRoutes = useMemo(
    () =>
      Object.values(normalizedLinks).reduce((acc: string[], link: NormalizedLink) => {
        if (link.hideTimeline) {
          acc.push(link.path);
        }
        return acc;
      }, []),
    [normalizedLinks]
  );
  return hiddenTimelineRoutes;
};

export const useShowTimelineForGivenPath = () => {
  const { capabilities } = useKibana().services.application;
  const userHasSecuritySolutionVisible = hasAccessToSecuritySolution(capabilities);

  const { indicesExist, dataViewId } = useSourcererDataView(SourcererScopeName.timeline);

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const hiddenTimelineRoutes = useHiddenTimelineRoutes();

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
      return !hiddenTimelineRoutes.some((route) => matchPath(pathname, route));
    },
    [isTimelineAllowed, hiddenTimelineRoutes]
  );

  return getIsTimelineVisible;
};
