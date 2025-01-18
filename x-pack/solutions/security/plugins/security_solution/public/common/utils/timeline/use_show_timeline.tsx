/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useShowTimelineForGivenPath } from './use_show_timeline_for_path';

export const useShowTimeline = () => {
  const { pathname } = useLocation();
  const getIsTimelineVisible = useShowTimelineForGivenPath();

  const showTimeline = useMemo(
    () => getIsTimelineVisible(pathname),
    [pathname, getIsTimelineVisible]
  );
  return [showTimeline];
};
