/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ProcessTreeNode } from '../process_tree_node';
import { BackToInvestigatedAlert } from '../back_to_investigated_alert';
import { useProcessTree } from './hooks';
import { collapseProcessTree } from './helpers';
import { ProcessTreeLoadMoreButton } from '../process_tree_load_more_button';
import type { AlertStatusEventEntityIdMap, Process, ProcessEventsPage } from '../../../common';
import { useScroll } from '../../hooks/use_scroll';
import { useStyles } from './styles';
import { PROCESS_EVENTS_PER_PAGE } from '../../../common/constants';
import { SessionViewTelemetryKey } from '../../types';

type FetchFunction = () => void;

const LOAD_NEXT_TEXT = i18n.translate('xpack.sessionView.processTree.loadMore', {
  defaultMessage: 'Show {pageSize} next events',
  values: {
    pageSize: PROCESS_EVENTS_PER_PAGE,
  },
});

const LOAD_PREVIOUS_TEXT = i18n.translate('xpack.sessionView.processTree.loadPrevious', {
  defaultMessage: 'Show {pageSize} previous events',
  values: {
    pageSize: PROCESS_EVENTS_PER_PAGE,
  },
});

export interface ProcessTreeDeps {
  // process.entity_id to act as root node (typically a session (or entry session) leader).
  sessionEntityId: string;

  data: ProcessEventsPage[];

  jumpToEntityId?: string;
  investigatedAlertId?: string;
  isFetching: boolean;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
  fetchNextPage: FetchFunction;
  fetchPreviousPage: FetchFunction;

  // plain text search query (only searches "process.working_directory process.args.join(' ')"
  searchQuery?: string;

  // currently selected process
  selectedProcess?: Process | null;
  onProcessSelected: (process: Process | null, isManualSelection?: boolean) => void;
  setSearchResults?: (results: Process[]) => void;

  // a map for alerts with updated status and process.entity_id
  updatedAlertsStatus: AlertStatusEventEntityIdMap;
  onShowAlertDetails: (alertUuid: string) => void;
  onJumpToOutput: (entityId: string) => void;
  showTimestamp?: boolean;
  verboseMode?: boolean;

  trackEvent(name: SessionViewTelemetryKey): void;
}

export const ProcessTree = ({
  sessionEntityId,
  data,
  jumpToEntityId,
  investigatedAlertId,
  isFetching,
  hasNextPage,
  hasPreviousPage,
  fetchNextPage,
  fetchPreviousPage,
  searchQuery,
  selectedProcess,
  onProcessSelected,
  setSearchResults,
  updatedAlertsStatus,
  onShowAlertDetails,
  onJumpToOutput,
  trackEvent,
  showTimestamp = true,
  verboseMode = false,
}: ProcessTreeDeps) => {
  const [isInvestigatedEventVisible, setIsInvestigatedEventVisible] = useState<boolean>(true);
  const [isInvestigatedEventAbove, setIsInvestigatedEventAbove] = useState<boolean>(false);
  const styles = useStyles();

  const { sessionLeader, processMap, searchResults } = useProcessTree({
    sessionEntityId,
    data,
    searchQuery,
    updatedAlertsStatus,
    verboseMode,
    jumpToEntityId,
  });
  const [forceRerender, setForceRerender] = useState(0);

  const eventsRemaining = useMemo(() => {
    const total = data?.[0]?.total || 0;
    const loadedSoFar = data.reduce((prev, current) => {
      return prev + (current?.events?.length || 0);
    }, 0);

    return total - loadedSoFar;
  }, [data]);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const onChangeJumpToEventVisibility = useCallback(
    (isVisible: boolean, isAbove: boolean) => {
      if (isVisible !== isInvestigatedEventVisible) {
        setIsInvestigatedEventVisible(isVisible);
      }
      if (!isVisible && isAbove !== isInvestigatedEventAbove) {
        setIsInvestigatedEventAbove(isAbove);
      }
    },
    [isInvestigatedEventVisible, isInvestigatedEventAbove]
  );

  const handleBackToInvestigatedAlert = useCallback(() => {
    onProcessSelected(null);
    setIsInvestigatedEventVisible(true);
  }, [onProcessSelected]);

  const handleCollapseProcessTree = useCallback(() => {
    collapseProcessTree(sessionLeader);
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = 0;
    }
    setForceRerender(Math.random());
    trackEvent('collapse_tree');
  }, [sessionLeader, trackEvent]);

  useEffect(() => {
    if (setSearchResults) {
      setSearchResults(searchResults);
    }
  }, [searchResults, setSearchResults]);

  useScroll({
    div: scrollerRef.current,
    handler: (pos: number, endReached: boolean) => {
      if (!isFetching && endReached) {
        fetchNextPage();
      }
    },
  });

  useEffect(() => {
    if (jumpToEntityId) {
      const process = processMap[jumpToEntityId];
      const hasDetails = !!process?.getDetails();

      if (!selectedProcess && hasDetails) {
        onProcessSelected(process);
      }
    } else if (!selectedProcess) {
      onProcessSelected(sessionLeader);
    }
  }, [jumpToEntityId, processMap, onProcessSelected, selectedProcess, sessionLeader]);

  return (
    <>
      <div
        ref={scrollerRef}
        css={styles.sessionViewProcessTree}
        data-test-subj="sessionView:sessionViewProcessTree"
        key={forceRerender}
      >
        {sessionLeader && (
          <ProcessTreeNode
            isSessionLeader
            process={sessionLeader}
            onProcessSelected={onProcessSelected}
            onJumpToOutput={onJumpToOutput}
            jumpToEntityId={jumpToEntityId}
            investigatedAlertId={investigatedAlertId}
            selectedProcess={selectedProcess}
            scrollerRef={scrollerRef}
            onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
            onShowAlertDetails={onShowAlertDetails}
            showTimestamp={showTimestamp}
            verboseMode={verboseMode}
            searchResults={searchResults}
            handleCollapseProcessTree={handleCollapseProcessTree}
            trackEvent={trackEvent}
            loadPreviousButton={
              hasPreviousPage ? (
                <ProcessTreeLoadMoreButton
                  text={LOAD_PREVIOUS_TEXT}
                  onClick={fetchPreviousPage}
                  isFetching={isFetching}
                  eventsRemaining={eventsRemaining}
                  forward={false}
                />
              ) : null
            }
            loadNextButton={
              hasNextPage ? (
                <ProcessTreeLoadMoreButton
                  text={LOAD_NEXT_TEXT}
                  onClick={fetchNextPage}
                  isFetching={isFetching}
                  eventsRemaining={eventsRemaining}
                  forward={true}
                />
              ) : null
            }
          />
        )}
      </div>
      {!isInvestigatedEventVisible && (
        <BackToInvestigatedAlert
          onClick={handleBackToInvestigatedAlert}
          isDisplayedAbove={isInvestigatedEventAbove}
        />
      )}
    </>
  );
};
