/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiResizableContainer,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import byteSize from 'byte-size';
import { SectionLoading } from '../../shared_imports';
import { ProcessTree } from '../process_tree';
import type { AlertStatusEventEntityIdMap, Process, ProcessEvent } from '../../../common';
import type { DisplayOptionsState } from '../session_view_display_options';
import { SessionViewDisplayOptions } from '../session_view_display_options';
import type { SessionViewDeps, SessionViewIndices, SessionViewTelemetryKey } from '../../types';
import { SessionViewDetailPanel } from '../session_view_detail_panel';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { TTYPlayer } from '../tty_player';
import { useStyles } from './styles';
import {
  useFetchAlertStatus,
  useFetchGetTotalIOBytes,
  useFetchSessionViewAlerts,
  useFetchSessionViewProcessEvents,
} from './hooks';
import { LOCAL_STORAGE_DISPLAY_OPTIONS_KEY } from '../../../common/constants';
import {
  AUDITBEAT_DATA_SOURCE,
  AUDITBEAT_INDEX,
  CLOUD_DEFEND_DATA_SOURCE,
  CLOUD_DEFEND_INDEX,
  ELASTIC_DEFEND_DATA_SOURCE,
  ENDPOINT_INDEX,
} from '../../methods';
import { DETAIL_PANEL, REFRESH_SESSION, TOGGLE_TTY_PLAYER } from './translations';

/**
 * The main wrapper component for the session view.
 */
export const SessionView = ({
  index,
  sessionEntityId,
  sessionStartTime,
  height,
  isFullScreen = false,
  jumpToEntityId,
  jumpToCursor,
  investigatedAlertId,
  loadAlertDetails,
  canReadPolicyManagement,
  trackEvent,
  openDetailsInExpandableFlyout,
  closeDetailsInExpandableFlyout,
  resetJumpToEntityId,
  resetJumpToCursor,
}: SessionViewDeps & { trackEvent: (name: SessionViewTelemetryKey) => void }) => {
  // don't engage jumpTo if jumping to session leader.
  if (jumpToEntityId === sessionEntityId) {
    jumpToEntityId = undefined;
    jumpToCursor = undefined;
  }

  // track session open telemetry
  useEffect(() => {
    const sourceMap: Record<string, SessionViewIndices> = {
      [CLOUD_DEFEND_INDEX]: CLOUD_DEFEND_DATA_SOURCE,
      [ENDPOINT_INDEX]: ELASTIC_DEFEND_DATA_SOURCE,
      [AUDITBEAT_INDEX]: AUDITBEAT_DATA_SOURCE,
    };

    const source = sourceMap[index] || 'unknown';

    const eventKey: SessionViewTelemetryKey = `loaded_from_${source}_${
      investigatedAlertId ? 'alert' : 'log'
    }` as SessionViewTelemetryKey;

    trackEvent(eventKey);
  }, [index, investigatedAlertId, trackEvent]);

  const [showTTY, setShowTTY] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Process[] | null>(null);
  const [displayOptions, setDisplayOptions] = useLocalStorage<DisplayOptionsState>(
    LOCAL_STORAGE_DISPLAY_OPTIONS_KEY,
    {
      timestamp: true,
      verboseMode: false,
    }
  );
  const [fetchAlertStatus, setFetchAlertStatus] = useState<string[]>([]);
  const [updatedAlertsStatus, setUpdatedAlertsStatus] = useState<AlertStatusEventEntityIdMap>({});
  const [currentJumpToCursor, setCurrentJumpToCursor] = useState(jumpToCursor);
  const [currentJumpToEntityId, setCurrentJumpToEntityId] = useState(jumpToEntityId);
  const [currentJumpToOutputEntityId, setCurrentJumpToOutputEntityId] = useState('');
  const sessionViewId = useMemo(() => `session-view-uuid-${uuidv4()}`, []);

  const styles = useStyles({ height, isFullScreen });

  const detailPanelCollapseFn = useRef(() => {});

  // to give an indication to the user that there may be more search results if they turn on verbose mode.
  const showVerboseSearchTooltip = useMemo(() => {
    return !!(!displayOptions?.verboseMode && searchQuery && searchResults?.length === 0);
  }, [displayOptions?.verboseMode, searchResults, searchQuery]);

  const onProcessSelected = useCallback(
    (process: Process | null, isManualSelection = false) => {
      setSelectedProcess(process);

      // used when SessionView is displayed in the expandable flyout
      // This refreshes the detailed panel rendered in the flyout preview panel
      // the isManualSelection prevents the detailed panel to render on first load of the SessionView component
      if (openDetailsInExpandableFlyout && isManualSelection) {
        openDetailsInExpandableFlyout(process);
      }
    },
    [openDetailsInExpandableFlyout]
  );

  const onJumpToEvent = useCallback(
    (event: ProcessEvent) => {
      if (event.process) {
        const { entity_id: entityId } = event.process;
        if (entityId !== sessionEntityId) {
          const alert = event.kibana?.alert;
          const cursor = alert ? alert?.original_time : event['@timestamp'];

          if (cursor) {
            setCurrentJumpToEntityId(entityId);
            setCurrentJumpToCursor(cursor);
          }
        }
        setSelectedProcess(null);
      }
    },
    [sessionEntityId]
  );

  const onJumpToOutput = useCallback((entityId: string) => {
    setCurrentJumpToOutputEntityId(entityId);
    setShowTTY(true);
  }, []);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    fetchPreviousPage,
    hasPreviousPage,
    refetch,
  } = useFetchSessionViewProcessEvents(
    index,
    sessionEntityId,
    sessionStartTime,
    currentJumpToCursor
  );

  const {
    data: alertsData,
    fetchNextPage: fetchNextPageAlerts,
    isFetching: isFetchingAlerts,
    hasNextPage: hasNextPageAlerts,
    error: alertsError,
    refetch: refetchAlerts,
  } = useFetchSessionViewAlerts(sessionEntityId, sessionStartTime, investigatedAlertId);

  const { data: totalTTYOutputBytes, refetch: refetchTotalTTYOutput } = useFetchGetTotalIOBytes(
    index,
    sessionEntityId,
    sessionStartTime
  );
  const hasTTYOutput = !!totalTTYOutputBytes?.total;
  const bytesOfOutput = useMemo(() => {
    const { unit, value } = byteSize(totalTTYOutputBytes?.total || 0);

    return { unit, value };
  }, [totalTTYOutputBytes?.total]);

  const onToggleTTY = useCallback(() => {
    if (hasTTYOutput) {
      setShowTTY(!showTTY);

      // used when SessionView is displayed in the expandable flyout
      // This closes the detailed panel rendered in the flyout preview panel when the user activate the TTY output mode
      // then reopens the detailed panel to the previously selected process when the user deactivates the TTY output mode
      if (closeDetailsInExpandableFlyout && !showTTY) {
        closeDetailsInExpandableFlyout();
      }
      if (openDetailsInExpandableFlyout && showTTY) {
        openDetailsInExpandableFlyout(selectedProcess);
      }

      trackEvent('tty_loaded');
    } else {
      trackEvent('disabled_tty_clicked');
    }
  }, [
    closeDetailsInExpandableFlyout,
    hasTTYOutput,
    openDetailsInExpandableFlyout,
    selectedProcess,
    showTTY,
    trackEvent,
  ]);

  const handleRefresh = useCallback(() => {
    refetch({ refetchPage: (_page, i, allPages) => allPages.length - 1 === i });
    refetchAlerts({ refetchPage: (_page, i, allPages) => allPages.length - 1 === i });
    refetchTotalTTYOutput();
    trackEvent('refresh_clicked');
  }, [refetch, refetchAlerts, refetchTotalTTYOutput, trackEvent]);

  const alerts = useMemo(() => {
    let events: ProcessEvent[] = [];

    if (alertsData) {
      alertsData.pages.forEach((page) => {
        events = events.concat(page.events);
      });
    }

    return events;
  }, [alertsData]);

  const alertsCount = useMemo(() => {
    return alertsData?.pages?.[0].total || 0;
  }, [alertsData]);

  const hasError = error || alertsError;
  const dataLoaded = data && data.pages?.length > (jumpToCursor ? 1 : 0);
  const renderIsLoading = isFetching && !dataLoaded;
  const hasData = dataLoaded && data.pages[0].events.length > 0;
  const { data: newUpdatedAlertsStatus } = useFetchAlertStatus(
    updatedAlertsStatus,
    fetchAlertStatus[0] ?? ''
  );

  /**
   * This useEffect should only impact the SessionView component when displayed in the expandable flyout.
   * The SessionView tree and its detailed panel are separated and this allows the detailed panel to reset the
   * view of the tree from the preview panel.
   */
  useEffect(() => {
    if (resetJumpToEntityId && resetJumpToCursor) {
      setSelectedProcess(null);
      setCurrentJumpToEntityId(resetJumpToEntityId);
      setCurrentJumpToCursor(resetJumpToCursor);
    }
  }, [resetJumpToCursor, resetJumpToEntityId]);

  useEffect(() => {
    if (newUpdatedAlertsStatus) {
      setUpdatedAlertsStatus({ ...newUpdatedAlertsStatus });
      // clearing alertUuids fetched without triggering a re-render
      fetchAlertStatus.shift();
    }
  }, [newUpdatedAlertsStatus, fetchAlertStatus]);

  const onSearchIndexChange = useCallback(
    (i: number) => {
      if (searchResults) {
        const process = searchResults[i];

        if (process) {
          onProcessSelected(process);
        }
      }
    },
    [onProcessSelected, searchResults]
  );

  useEffect(() => {
    onSearchIndexChange(0);
  }, [onSearchIndexChange, searchResults]);

  const handleOnAlertDetailsClosed = useCallback((alertUuid: string) => {
    setFetchAlertStatus([alertUuid]);
  }, []);

  const toggleDetailPanel = useCallback(() => {
    const newValue = !isDetailOpen;
    detailPanelCollapseFn.current();
    setIsDetailOpen(newValue);

    if (newValue) {
      trackEvent('details_opened');
    } else {
      trackEvent('details_closed');
    }
  }, [isDetailOpen, trackEvent]);

  const toggleDetailPanelInFlyout = useCallback(() => {
    if (openDetailsInExpandableFlyout) {
      openDetailsInExpandableFlyout(selectedProcess);
    }
  }, [openDetailsInExpandableFlyout, selectedProcess]);

  const onShowAlertDetails = useCallback(
    (alertUuid: string) => {
      if (loadAlertDetails) {
        loadAlertDetails(alertUuid, () => handleOnAlertDetailsClosed(alertUuid));
        trackEvent('alert_details_loaded');
      }
    },
    [loadAlertDetails, trackEvent, handleOnAlertDetailsClosed]
  );

  const handleOptionChange = useCallback(
    (checkedOptions: DisplayOptionsState) => {
      setDisplayOptions(checkedOptions);

      if (checkedOptions.verboseMode !== displayOptions?.verboseMode) {
        if (checkedOptions.verboseMode) {
          trackEvent('verbose_mode_enabled');
        } else {
          trackEvent('verbose_mode_disabled');
        }
      }

      if (checkedOptions.timestamp !== displayOptions?.timestamp) {
        if (checkedOptions.timestamp) {
          trackEvent('timestamp_enabled');
        } else {
          trackEvent('timestamp_disabled');
        }
      }
    },
    [displayOptions?.timestamp, displayOptions?.verboseMode, setDisplayOptions, trackEvent]
  );

  const errorEmptyPrompt = useMemo(
    () =>
      hasError ? (
        <EuiEmptyPrompt
          iconType="warning"
          color="danger"
          title={
            <h2>
              <FormattedMessage
                id="xpack.sessionView.errorHeading"
                defaultMessage="Error loading Session View"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.sessionView.errorMessage"
                defaultMessage="There was an error loading the Session View."
              />
            </p>
          }
        />
      ) : null,
    [hasError]
  );

  const processTree = useMemo(
    () =>
      hasData ? (
        <div css={styles.processTree}>
          <ProcessTree
            key={sessionEntityId + currentJumpToCursor}
            sessionEntityId={sessionEntityId}
            data={data.pages}
            searchQuery={searchQuery}
            selectedProcess={selectedProcess}
            onProcessSelected={onProcessSelected}
            onJumpToOutput={onJumpToOutput}
            jumpToEntityId={currentJumpToEntityId}
            investigatedAlertId={investigatedAlertId}
            isFetching={isFetching}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
            fetchPreviousPage={fetchPreviousPage}
            setSearchResults={setSearchResults}
            updatedAlertsStatus={updatedAlertsStatus}
            onShowAlertDetails={onShowAlertDetails}
            showTimestamp={displayOptions?.timestamp}
            verboseMode={displayOptions?.verboseMode}
            trackEvent={trackEvent}
          />
        </div>
      ) : null,
    [
      currentJumpToCursor,
      currentJumpToEntityId,
      data?.pages,
      displayOptions?.timestamp,
      displayOptions?.verboseMode,
      fetchNextPage,
      fetchPreviousPage,
      hasData,
      hasNextPage,
      hasPreviousPage,
      investigatedAlertId,
      isFetching,
      onJumpToOutput,
      onProcessSelected,
      onShowAlertDetails,
      searchQuery,
      selectedProcess,
      sessionEntityId,
      styles.processTree,
      trackEvent,
      updatedAlertsStatus,
    ]
  );

  if (renderIsLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.sessionView.loadingProcessTree"
          defaultMessage="Loading session…"
        />
      </SectionLoading>
    );
  }

  if (!hasData) {
    return (
      <EuiEmptyPrompt
        data-test-subj="sessionView:sessionViewProcessEventsEmpty"
        title={
          <h2>
            <FormattedMessage
              id="xpack.sessionView.emptyDataTitle"
              defaultMessage="No data to render"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.sessionView.emptyDataMessage"
              defaultMessage="No process events found for this query."
            />
          </p>
        }
      />
    );
  }

  return (
    <div css={styles.sessionViewerComponent}>
      <EuiPanel hasShadow={false} borderRadius="none" className="sessionViewerToolbar">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem data-test-subj="sessionView:sessionViewProcessEventsSearch">
            <SessionViewSearchBar
              searchQuery={searchQuery}
              totalMatches={searchResults?.length || 0}
              setSearchQuery={setSearchQuery}
              onPrevious={onSearchIndexChange}
              onNext={onSearchIndexChange}
              trackEvent={trackEvent}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiToolTip
              title={
                <>
                  {bytesOfOutput.value} {bytesOfOutput.unit}
                  <FormattedMessage
                    id="xpack.sessionView.ttyToggleTip"
                    defaultMessage=" of TTY output"
                  />
                </>
              }
            >
              <EuiButtonIcon
                isSelected={showTTY}
                display={showTTY ? 'fill' : 'empty'}
                iconType="apmTrace"
                onClick={onToggleTTY}
                size="m"
                aria-label={TOGGLE_TTY_PLAYER}
                data-test-subj="sessionView:TTYPlayerToggle"
                css={!hasTTYOutput && styles.fakeDisabled}
              />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="refresh"
              display="empty"
              onClick={handleRefresh}
              size="m"
              aria-label={REFRESH_SESSION}
              data-test-subj="sessionView:sessionViewRefreshButton"
              isLoading={isFetching}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <SessionViewDisplayOptions
              displayOptions={displayOptions!}
              onChange={handleOptionChange}
              showVerboseSearchTooltip={showVerboseSearchTooltip}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {openDetailsInExpandableFlyout ? (
              <EuiButtonIcon onClick={toggleDetailPanelInFlyout} iconType="list" />
            ) : (
              <EuiButton
                onClick={toggleDetailPanel}
                iconType="list"
                data-test-subj="sessionView:sessionViewDetailPanelToggle"
                fill={!isDetailOpen}
              >
                {DETAIL_PANEL}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      {openDetailsInExpandableFlyout ? (
        <>
          {errorEmptyPrompt}
          {processTree}
        </>
      ) : (
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            detailPanelCollapseFn.current = () => {
              togglePanel?.(sessionViewId, { direction: 'left' });
            };

            return (
              <>
                <EuiResizablePanel initialSize={100} minSize="60%" paddingSize="none">
                  {errorEmptyPrompt}
                  {processTree}
                </EuiResizablePanel>
                <EuiResizableButton css={styles.resizeHandle} />
                <EuiResizablePanel
                  id={sessionViewId}
                  initialSize={30}
                  minSize="320px"
                  paddingSize="none"
                  css={styles.detailPanel}
                >
                  <SessionViewDetailPanel
                    index={index}
                    alerts={alerts}
                    alertsCount={alertsCount}
                    isFetchingAlerts={isFetchingAlerts}
                    hasNextPageAlerts={hasNextPageAlerts}
                    fetchNextPageAlerts={fetchNextPageAlerts}
                    investigatedAlertId={investigatedAlertId}
                    selectedProcess={selectedProcess}
                    onJumpToEvent={onJumpToEvent}
                    onShowAlertDetails={onShowAlertDetails}
                  />
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      )}
      <TTYPlayer
        index={index}
        show={showTTY}
        sessionEntityId={sessionEntityId}
        sessionStartTime={sessionStartTime}
        onClose={onToggleTTY}
        isFullscreen={isFullScreen}
        onJumpToEvent={onJumpToEvent}
        autoSeekToEntityId={currentJumpToOutputEntityId}
        canReadPolicyManagement={canReadPolicyManagement}
        trackEvent={trackEvent}
      />
    </div>
  );
};
// eslint-disable-next-line import/no-default-export
export { SessionView as default };
