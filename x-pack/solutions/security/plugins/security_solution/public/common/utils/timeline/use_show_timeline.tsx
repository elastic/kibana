/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useShowTimelineForGivenPath } from './use_show_timeline_for_path';
import { useUserPrivileges } from '../../components/user_privileges';

export const useShowTimeline = () => {
  const { pathname } = useLocation();
  const hasBeenVisible = useRef(false);
  const getIsTimelineVisible = useShowTimelineForGivenPath();
  const {
    timelinePrivileges: { read: canSeeTimeline },
  } = useUserPrivileges();

  return useMemo(() => {
    const isCurrentlyVisible = canSeeTimeline && getIsTimelineVisible(pathname);
    if (isCurrentlyVisible) {
      hasBeenVisible.current = true;
    }
    return [hasBeenVisible.current];
  }, [pathname, canSeeTimeline, getIsTimelineVisible]);
};
