/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import {
  CHANGE_POINT_TYPES,
  MAX_RULE_NAME_LENGTH,
  type Detection,
} from '@kbn/significant-events-schema';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DetectionDetailsFlyout } from '../../../components/entities/detection/detection_details_flyout';
import { getChangePointLabel } from '../../../common/change_point';
import { FilterPopover } from '../../../components/ui/filter_popover';
import { useDetectionById } from '../../../data/detections/use_detection_by_id';
import { useDetectionsList } from '../../../data/detections/use_detections_list';
import { useSourcesById } from '../../../data/sources/use_sources_by_id';
import { useKibana } from '../../../hooks/use_kibana';
import type { DetectionTimeRange } from '../use_detection_time_range';
import { SignalsTable } from './signals_table';
import {
  CHANGE_LABEL,
  CLEAR_FILTERS_LABEL,
  EMPTY_BODY,
  EMPTY_TITLE,
  LIST_ERROR_MESSAGE,
  LIST_ERROR_TITLE,
  RETRY_LABEL,
  SEARCH_PLACEHOLDER,
  SIGNAL_ERROR_MESSAGE,
  SIGNAL_ERROR_TITLE,
  SIGNAL_NOT_FOUND_TOAST_TITLE,
} from './translations';
import { useSignalsUrlState } from './use_signals_url_state';

const DEFAULT_PAGE_SIZE = 25;

export const SignalsTab = ({
  timeRange,
  onTimeRangeChange,
  entities,
  unassigned,
}: {
  timeRange: DetectionTimeRange;
  onTimeRangeChange: (timeRange: DetectionTimeRange) => void;
  entities: string[];
  unassigned: boolean;
}): React.ReactElement => {
  const { notifications } = useKibana().services;
  const { getSourceTitle } = useSourcesById();
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const openLinks = useRef(new Map<string, HTMLAnchorElement | HTMLButtonElement | null>());
  const {
    searchValue,
    searchQuery,
    changeTypes,
    page,
    signalId,
    hasFilters,
    onSearchChange,
    setChangeTypes,
    setPage,
    openSignal,
    closeSignal,
    clearFilters,
  } = useSignalsUrlState();
  const signalsQuery = useDetectionsList({
    ...timeRange,
    page,
    perPage,
    search: searchQuery,
    change_point_type: changeTypes,
    entityIds: entities,
    unassignedEntities: unassigned,
  });
  const signals = signalsQuery.data?.hits ?? [];
  const lastPage = Math.max(1, Math.ceil((signalsQuery.data?.total ?? 0) / perPage));
  const isPastLastPage = Boolean(signalsQuery.data) && page > lastPage;
  const signalOnPage = signalId
    ? signals.find(({ detection_id: detectionId }) => detectionId === signalId)
    : undefined;
  const signalByIdQuery = useDetectionById(signalId, {
    enabled: Boolean(signalId) && !signalOnPage && !signalsQuery.isLoading,
  });
  const openSignalData = signalOnPage ?? signalByIdQuery.data ?? undefined;

  useEffect(() => {
    if (
      signalId &&
      !signalOnPage &&
      !signalsQuery.isLoading &&
      signalByIdQuery.isSuccess &&
      signalByIdQuery.data === null
    ) {
      notifications.toasts.addWarning({ title: SIGNAL_NOT_FOUND_TOAST_TITLE });
      closeSignal(true);
    }
  }, [
    closeSignal,
    notifications.toasts,
    signalByIdQuery.data,
    signalByIdQuery.isSuccess,
    signalId,
    signalOnPage,
    signalsQuery.isLoading,
  ]);

  useEffect(() => {
    if (isPastLastPage) {
      setPage(lastPage, true);
    }
  }, [isPastLastPage, lastPage, setPage]);

  const handlePageChange = useCallback(
    (nextPage: number, nextPerPage: number) => {
      if (nextPerPage !== perPage) {
        setPerPage(nextPerPage);
        setPage(1);
        return;
      }
      setPage(nextPage);
    },
    [perPage, setPage]
  );

  const handleCloseFlyout = useCallback(() => {
    const openLink = signalId ? openLinks.current.get(signalId) : undefined;
    closeSignal();
    window.requestAnimationFrame(() => openLink?.focus());
  }, [closeSignal, signalId]);

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            data-test-subj="nightshiftDetectionSignalsSearch"
            compressed
            fullWidth
            isClearable
            maxLength={MAX_RULE_NAME_LENGTH}
            placeholder={SEARCH_PLACEHOLDER}
            aria-label={SEARCH_PLACEHOLDER}
            value={searchValue}
            onChange={onSearchChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <FilterPopover
              label={CHANGE_LABEL}
              options={CHANGE_POINT_TYPES}
              selected={changeTypes}
              counts={undefined}
              getLabel={getChangePointLabel}
              onChange={setChangeTypes}
              testSubject="nightshiftDetectionSignalsChangeFilter"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            compressed
            width="auto"
            showUpdateButton={false}
            start={timeRange.from}
            end={timeRange.to}
            onTimeChange={({ start, end }) => onTimeRangeChange({ from: start, to: end })}
            data-test-subj="nightshiftDetectionSignalsTimePicker"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {signalByIdQuery.isError && !openSignalData ? (
        <>
          <KbnDangerCallout
            announceOnMount
            title={SIGNAL_ERROR_TITLE}
            text={SIGNAL_ERROR_MESSAGE}
            size="s"
            data-test-subj="nightshiftDetectionSignalError"
            actionProps={{
              primary: {
                children: RETRY_LABEL,
                iconType: 'refresh',
                onClick: () => void signalByIdQuery.refetch(),
                'data-test-subj': 'nightshiftDetectionSignalRetryButton',
              },
            }}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      {signalsQuery.isError && !signalsQuery.data ? (
        <KbnDangerCallout
          announceOnMount
          title={LIST_ERROR_TITLE}
          text={LIST_ERROR_MESSAGE}
          size="s"
          data-test-subj="nightshiftDetectionSignalsError"
          actionProps={{
            primary: {
              children: RETRY_LABEL,
              iconType: 'refresh',
              onClick: () => void signalsQuery.refetch(),
              'data-test-subj': 'nightshiftDetectionSignalsRetryButton',
            },
          }}
        />
      ) : !signalsQuery.isLoading &&
        signalsQuery.data &&
        signals.length === 0 &&
        !isPastLastPage ? (
        <EuiEmptyPrompt
          data-test-subj="nightshiftDetectionSignalsEmpty"
          iconType="magnify"
          title={<h2>{EMPTY_TITLE}</h2>}
          body={<p>{EMPTY_BODY}</p>}
          actions={
            hasFilters ? (
              <EuiButton
                onClick={clearFilters}
                data-test-subj="nightshiftDetectionSignalsClearFilters"
              >
                {CLEAR_FILTERS_LABEL}
              </EuiButton>
            ) : undefined
          }
        />
      ) : (
        <SignalsTable
          signals={signals}
          total={signalsQuery.data?.total ?? 0}
          page={page}
          perPage={perPage}
          isLoading={signalsQuery.isFetching}
          selectedSignalId={signalId}
          getSourceTitle={getSourceTitle}
          onSignalClick={(signal: Detection) => openSignal(signal.detection_id)}
          onPageChange={handlePageChange}
          onOpenLinkMount={(id, element) => openLinks.current.set(id, element)}
        />
      )}
      {openSignalData ? (
        <DetectionDetailsFlyout
          detection={openSignalData}
          getSourceTitle={getSourceTitle}
          onClose={handleCloseFlyout}
        />
      ) : null}
    </>
  );
};
