/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useHistory, useParams, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner, EuiLoadingChart, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { PageLoader } from '../common/components/page_loader';
import { ConfigKey } from '../../../../../common/runtime_types';
import { resetMonitorLastRunAction } from '../../state';
import { useMonitorLatestPing } from './hooks/use_monitor_latest_ping';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useSyntheticsRefreshContext } from '../../contexts';
import { MonitorRemoteCallout } from './monitor_remote_callout';

const TIMEOUT_CHECK_INTERVAL_MS = 30_000;
const SCHEDULE_MULTIPLIER = 2;
const MIN_TIMEOUT_MS = 60_000;

const getScheduleIntervalMs = (schedule?: { number: string; unit: string }): number | null => {
  if (!schedule?.number) return null;
  const value = parseInt(schedule.number, 10);
  if (isNaN(value) || value <= 0) return null;
  return schedule.unit === 's' ? value * 1000 : value * 60_000;
};

export const MonitorPendingWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const currentLocation = useLocation();
  const locationRef = useRef(currentLocation);
  const { monitorId } = useParams<{ monitorId: string }>();
  const { refreshApp } = useSyntheticsRefreshContext();
  const { monitor } = useSelectedMonitor({ refetchMonitorEnabled: false });

  const { latestPing, loaded: pingsLoaded } = useMonitorLatestPing();
  const [loaded, setLoaded] = useState(false);
  const [hasPing, setHasPing] = useState(false);
  const [isStuckPending, setIsStuckPending] = useState(false);

  const schedule = monitor?.[ConfigKey.SCHEDULE];
  const createdAt = monitor?.created_at;

  const hasPrivateLocation = useMemo(
    () =>
      (monitor?.[ConfigKey.LOCATIONS] ?? []).some(
        (loc: { isServiceManaged?: boolean }) => !loc.isServiceManaged
      ),
    [monitor]
  );

  const scheduleIntervalMs = useMemo(() => getScheduleIntervalMs(schedule), [schedule]);

  const checkTimeout = useCallback(() => {
    if (!createdAt || !scheduleIntervalMs) return;
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return;
    const threshold = Math.max(
      createdTime + SCHEDULE_MULTIPLIER * scheduleIntervalMs,
      createdTime + MIN_TIMEOUT_MS
    );
    setIsStuckPending(Date.now() > threshold);
  }, [createdAt, scheduleIntervalMs]);

  useEffect(() => {
    if (loaded && !hasPing) {
      checkTimeout();
      const timer = setInterval(checkTimeout, TIMEOUT_CHECK_INTERVAL_MS);
      return () => clearInterval(timer);
    }
    setIsStuckPending(false);
  }, [loaded, hasPing, checkTimeout]);

  const unlisten = useMemo(
    () =>
      history.listen((location) => {
        const currentMonitorId = location.pathname.split('/')[2] || '';
        const hasDifferentSearch = locationRef.current.search !== location.search;
        const hasDifferentId = currentMonitorId !== monitorId;
        locationRef.current = location;
        if (hasDifferentSearch || hasDifferentId) {
          setLoaded(false);
          setHasPing(false);
          setIsStuckPending(false);
          dispatch(resetMonitorLastRunAction());
          refreshApp();
        }
      }),
    [history, monitorId, dispatch, refreshApp]
  );

  useEffect(() => {
    return function cleanup() {
      unlisten();
    };
  }, [unlisten]);

  useEffect(() => {
    if (pingsLoaded) {
      setLoaded(true);
    }
    if (pingsLoaded && latestPing) {
      setHasPing(true);
    }
  }, [pingsLoaded, latestPing, dispatch, unlisten]);

  const formattedInterval = scheduleIntervalMs
    ? scheduleIntervalMs >= 60_000
      ? `${scheduleIntervalMs / 60_000}m`
      : `${scheduleIntervalMs / 1000}s`
    : null;

  const warningBody = hasPrivateLocation
    ? MONITOR_PENDING_WARNING_BODY_PRIVATE
    : formattedInterval
    ? i18n.translate('xpack.synthetics.monitorDetails.pending.warningBody', {
        defaultMessage:
          'This monitor has been pending for longer than its configured schedule interval ({interval}). This could indicate that the Elastic Agent is unable to index data. Check agent logs for indexing errors.',
        values: { interval: formattedInterval },
      })
    : MONITOR_PENDING_WARNING_BODY_GENERIC;

  return (
    <>
      <MonitorRemoteCallout />
      {!loaded ? (
        <PageLoader
          icon={<EuiLoadingSpinner size="xxl" />}
          title={<h3>{LOADING_TITLE}</h3>}
          body={<p>{LOADING_DESCRIPTION}</p>}
        />
      ) : null}
      {loaded && !hasPing ? (
        <>
          {isStuckPending && (
            <>
              <EuiCallOut
                title={MONITOR_PENDING_WARNING_TITLE}
                color="warning"
                iconType="warning"
                data-test-subj="syntheticsMonitorPendingTimeoutWarning"
              >
                <p>{warningBody}</p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}
          <PageLoader
            icon={<EuiLoadingChart size="xl" />}
            title={<h3>{MONITOR_PENDING_HEADING}</h3>}
            body={<p>{MONITOR_PENDING_CONTENT}</p>}
          />
        </>
      ) : null}
      <div
        style={loaded && hasPing ? undefined : { display: 'none' }}
        data-test-subj="syntheticsPendingWrapperChildren"
      >
        {children}
      </div>
    </>
  );
};

export const MONITOR_PENDING_HEADING = i18n.translate(
  'xpack.synthetics.monitorDetails.pending.heading',
  {
    defaultMessage: 'Initial test run pending...',
  }
);

export const MONITOR_PENDING_CONTENT = i18n.translate(
  'xpack.synthetics.monitorDetails.pending.content',
  {
    defaultMessage: 'This page will refresh when data becomes available.',
  }
);

export const LOADING_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorDetails.loading.content',
  {
    defaultMessage: 'This will take just a second.',
  }
);

export const LOADING_TITLE = i18n.translate('xpack.synthetics.monitorDetails.loading.heading', {
  defaultMessage: 'Loading monitor details',
});

export const MONITOR_PENDING_WARNING_TITLE = i18n.translate(
  'xpack.synthetics.monitorDetails.pending.warningTitle',
  {
    defaultMessage: 'No data received',
  }
);

export const MONITOR_PENDING_WARNING_BODY_PRIVATE = i18n.translate(
  'xpack.synthetics.monitorDetails.pending.warningBodyPrivate',
  {
    defaultMessage:
      'The Elastic Agent appears to be online but no data has been received for this monitor. This may indicate an indexing issue. Check agent logs for errors such as document_parsing_exception.',
  }
);

export const MONITOR_PENDING_WARNING_BODY_GENERIC = i18n.translate(
  'xpack.synthetics.monitorDetails.pending.warningBodyGeneric',
  {
    defaultMessage:
      'This monitor has been pending for longer than expected. This could indicate that the Elastic Agent is unable to index data. Check agent logs for indexing errors.',
  }
);
