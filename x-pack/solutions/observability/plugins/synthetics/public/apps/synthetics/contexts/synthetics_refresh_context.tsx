/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  FC,
} from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useEvent from 'react-use/lib/useEvent';
import moment from 'moment';
import { Subject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { CLIENT_DEFAULTS_SYNTHETICS } from '../../../../common/constants/synthetics/client_defaults';
const { AUTOREFRESH_INTERVAL_SECONDS, AUTOREFRESH_IS_PAUSED } = CLIENT_DEFAULTS_SYNTHETICS;

interface SyntheticsRefreshContext {
  lastRefresh: number;
  refreshApp: () => void;
  refreshInterval: number;
  refreshPaused: boolean;
  setRefreshInterval: (interval: number) => void;
  setRefreshPaused: (paused: boolean) => void;
}

const defaultContext: SyntheticsRefreshContext = {
  lastRefresh: 0,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
  refreshInterval: AUTOREFRESH_INTERVAL_SECONDS,
  refreshPaused: AUTOREFRESH_IS_PAUSED,
  setRefreshInterval: () => {
    throw new Error(
      i18n.translate('xpack.synthetics.refreshContext.intervalNotInitialized', {
        defaultMessage: 'Refresh interval was not initialized, set it when you invoke the context',
      })
    );
  },
  setRefreshPaused: () => {
    throw new Error(
      i18n.translate('xpack.synthetics.refreshContext.pausedNotInitialized', {
        defaultMessage: 'Refresh paused was not initialized, set it when you invoke the context',
      })
    );
  },
};

export const SyntheticsRefreshContext = createContext(defaultContext);

export const SyntheticsRefreshContextProvider: FC<
  React.PropsWithChildren<{
    reload$?: Subject<boolean>;
  }>
> = ({ children, reload$ }) => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const [refreshInterval, setRefreshInterval] = useLocalStorage<number>(
    'xpack.synthetics.refreshInterval',
    AUTOREFRESH_INTERVAL_SECONDS
  );
  const [refreshPaused, setRefreshPaused] = useLocalStorage<boolean>(
    'xpack.synthetics.refreshPaused',
    AUTOREFRESH_IS_PAUSED
  );

  const refreshApp = useCallback(() => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
  }, [setLastRefresh]);

  useEffect(() => {
    if (!refreshPaused) {
      refreshApp();
    }
  }, [refreshApp, refreshPaused]);

  useEffect(() => {
    const subscription = reload$?.subscribe(() => {
      refreshApp();
    });
    return () => subscription?.unsubscribe();
  }, [reload$, refreshApp]);

  const value = useMemo(() => {
    return {
      lastRefresh,
      refreshApp,
      refreshInterval: refreshInterval ?? AUTOREFRESH_INTERVAL_SECONDS,
      refreshPaused: refreshPaused ?? AUTOREFRESH_IS_PAUSED,
      setRefreshInterval,
      setRefreshPaused,
    };
  }, [
    lastRefresh,
    refreshApp,
    refreshInterval,
    refreshPaused,
    setRefreshInterval,
    setRefreshPaused,
  ]);

  useEvent(
    'visibilitychange',
    () => {
      const isOutdated =
        moment().diff(new Date(lastRefresh), 'seconds') >
        (refreshInterval || AUTOREFRESH_INTERVAL_SECONDS);
      if (document.visibilityState !== 'hidden' && !refreshPaused && isOutdated) {
        refreshApp();
      }
    },
    document
  );

  useEffect(() => {
    if (refreshPaused) {
      return;
    }
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        refreshApp();
      }
    }, (refreshInterval || AUTOREFRESH_INTERVAL_SECONDS) * 1000);
    return () => clearInterval(interval);
  }, [refreshPaused, refreshApp, refreshInterval]);

  return <SyntheticsRefreshContext.Provider value={value} children={children} />;
};

export const useSyntheticsRefreshContext = () => useContext(SyntheticsRefreshContext);
