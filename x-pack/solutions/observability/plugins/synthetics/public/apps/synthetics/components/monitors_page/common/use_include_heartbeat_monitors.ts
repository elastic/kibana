/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { selectOverviewPageState, setOverviewPageStateAction } from '../../../state';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { INCLUDE_HEARTBEAT_MONITORS_KEY } from '../../../state/utils/get_initial_include_heartbeat_monitors';

export const INCLUDE_HEARTBEAT_MONITORS_DEFAULT = true;

/**
 * Whether read-only Heartbeat / Elastic Agent autodiscovered monitors
 * (`origin: 'heartbeat'`, no saved object) are surfaced in the overview.
 *
 * The value is passed to the `overview_status` query, so the server skips
 * synthesizing them when off (up/down counts follow) — flipping it triggers a
 * refetch via the `pageState` dependency in `useOverviewStatus`. Persisted per
 * space in localStorage; the Redux initial state is seeded synchronously from
 * the same key (see `getInitialIncludeHeartbeatMonitors`), so no mount-time
 * sync effect is needed and there is no duplicate initial fetch.
 */
export const useIncludeHeartbeatMonitors = () => {
  const dispatch = useDispatch();
  const { space } = useKibanaSpace();
  const spaceId = space?.id ?? 'default';

  const [storedVal, setStoredVal] = useLocalStorage<boolean>(
    INCLUDE_HEARTBEAT_MONITORS_KEY + spaceId,
    INCLUDE_HEARTBEAT_MONITORS_DEFAULT
  );

  const { includeHeartbeatMonitors } = useSelector(selectOverviewPageState);
  const checked = includeHeartbeatMonitors ?? storedVal ?? INCLUDE_HEARTBEAT_MONITORS_DEFAULT;

  const setChecked = useCallback(
    (val: boolean) => {
      setStoredVal(val);
      dispatch(setOverviewPageStateAction({ includeHeartbeatMonitors: val }));
    },
    [dispatch, setStoredVal]
  );

  return { checked, setChecked };
};
