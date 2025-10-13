/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { matchPath } from 'react-router-dom';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import type { NormalizedLink } from '../../links';
import { useNormalizedAppLinks } from '../../links/links_hooks';
import { useKibana } from '../../lib/kibana';
import { hasAccessToSecuritySolution } from '../../../helpers_access';

const useHiddenTimelineRoutes = () => {
  const normalizedLinks = useNormalizedAppLinks();
  return useMemo(
    () =>
      Object.values(normalizedLinks).reduce((acc: string[], link: NormalizedLink) => {
        if (link.hideTimeline) {
          acc.push(link.path);
        }
        return acc;
      }, []),
    [normalizedLinks]
  );
};

export const useShowTimelineForGivenPath = () => {
  const { capabilities } = useKibana().services.application;
  const userHasSecuritySolutionVisible = hasAccessToSecuritySolution(capabilities);

  const { dataView } = useDataView(PageScope.timeline);
  const indicesExist = dataView.hasMatchedIndices();

  const hiddenTimelineRoutes = useHiddenTimelineRoutes();
  const isTimelineAllowed = useMemo(
    () => userHasSecuritySolutionVisible && indicesExist,
    [userHasSecuritySolutionVisible, indicesExist]
  );

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
