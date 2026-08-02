/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { buildLifecycleSearch } from './helpers/lifecycle_search_params';

/**
 * The one thing another page needs to open the four-phase lifecycle over itself.
 *
 * The HITL queue, the runs table and the chats view all call only this: it pushes the discovery id
 * into the current location's search string, and `LifecycleFlyoutHost` — already mounted above every
 * PND route — renders the overlay. No provider to mount, no component to import, and the page the
 * analyst was reading stays exactly where it was, behind the overlay.
 *
 * `push` rather than `replace`, so the browser Back button closes the overlay instead of leaving the
 * page.
 */
export const useOpenLifecycle = (correlationId: string): (() => void) => {
  const history = useHistory();
  const { pathname, search } = useLocation();

  return useCallback(() => {
    if (!correlationId) {
      return;
    }

    history.push({ pathname, search: buildLifecycleSearch(search, correlationId) });
  }, [correlationId, history, pathname, search]);
};
