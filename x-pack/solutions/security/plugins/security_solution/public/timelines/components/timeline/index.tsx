/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { EuiPanel, EuiProgress, EuiText } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { isTab } from '@kbn/timelines-plugin/public';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { DEFAULT_ALERTS_INDEX, DEFAULT_DATA_VIEW_ID } from '../../../../common/constants';
import { PageScope } from '../../../data_view_manager/constants';
import { timelineActions, timelineSelectors } from '../../store';
import { timelineDefaults } from '../../store/defaults';
import type { CellValueElementProps } from './cell_rendering';
import { TimelineModalHeader } from '../modal/header';
import type { RowRenderer, TimelineId } from '../../../../common/types/timeline';
import { TimelineTypeEnum } from '../../../../common/api/timeline';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { EVENTS_COUNT_BUTTON_CLASS_NAME, onTimelineTabKeyPressed } from './helpers';
import * as i18n from './translations';
import { TabsContent } from './tabs';
import { HideShowContainer, TimelineContainer } from './styles';
import { useTimelineFullScreen } from '../../../common/containers/use_full_screen';
import { EXIT_FULL_SCREEN_CLASS_NAME } from '../../../common/components/exit_full_screen';
import { useResolveConflict } from '../../../common/hooks/use_resolve_conflict';
import { defaultUdtHeaders } from './body/column_headers/default_headers';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { TimelineContext } from './context';

const TimelineBody = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export interface Props {
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: TimelineId;
  openToggleRef: React.MutableRefObject<null | HTMLAnchorElement | HTMLButtonElement>;
}

const TimelineSavingProgressComponent: React.FC<{ timelineId: TimelineId }> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const isSaving = useShallowEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).isSaving
  );

  return isSaving ? <EuiProgress size="s" color="primary" position="absolute" /> : null;
};

const TimelineSavingProgress = React.memo(TimelineSavingProgressComponent);

const StatefulTimelineComponent: React.FC<Props> = ({
  renderCellValue,
  rowRenderers,
  timelineId,
  openToggleRef,
}) => {
  const dispatch = useDispatch();

  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    dataViewId: selectedDataViewIdTimeline,
    indexNames: selectedPatternsTimeline,
    savedObjectId,
    timelineType,
    description,
    initialized,
  } = useDeepEqualSelector((state) =>
    pick(
      [
        'indexNames',
        'dataViewId',
        'savedObjectId',
        'timelineType',
        'description',
        'initialized',
        'show',
        'activeTab',
      ],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );

  const { timelineFullScreen } = useTimelineFullScreen();

  const spaceId = useSpaceId();

  const selectedPatterns = useSelectedPatterns(PageScope.timeline);
  const { dataView, status } = useDataView(PageScope.timeline);
  const selectedDataViewId = useMemo(() => dataView.id ?? '', [dataView.id]);

  useEffect(() => {
    if (!savedObjectId && !initialized) {
      dispatch(
        timelineActions.createTimeline({
          id: timelineId,
          columns: defaultUdtHeaders,
          dataViewId: selectedDataViewId,
          indexNames: selectedPatterns,
          show: false,
          excludedRowRendererIds: timelineDefaults.excludedRowRendererIds,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSourcererChange = useCallback(() => {
    if (
      // timeline not initialized, so this must be initial state and not user change
      !savedObjectId ||
      selectedDataViewId == null ||
      // initial state will get set on create
      (selectedDataViewIdTimeline === null && selectedPatternsTimeline.length === 0) ||
      // don't update if no change
      (selectedDataViewIdTimeline === selectedDataViewId &&
        selectedPatternsTimeline.sort().join() === selectedPatterns.sort().join())
    ) {
      return;
    }
    // TODO: newDataViewPickerEnabled: With the new data view picker, we should not update the selected patterns
    // on timeline, as that prevents us from guiding the user to duplicate the data view or using the new alerts only dv
    if (
      selectedDataViewIdTimeline === `${DEFAULT_DATA_VIEW_ID}-${spaceId}` &&
      selectedPatternsTimeline.length === 1 &&
      selectedPatternsTimeline[0].includes(DEFAULT_ALERTS_INDEX)
    ) {
      return;
    }
    dispatch(
      timelineActions.updateDataView({
        dataViewId: selectedDataViewId,
        id: timelineId,
        indexNames: selectedPatterns,
      })
    );
  }, [
    dispatch,
    savedObjectId,
    selectedDataViewId,
    selectedDataViewIdTimeline,
    selectedPatterns,
    selectedPatternsTimeline,
    spaceId,
    timelineId,
  ]);

  useEffect(() => {
    // NOTE: dont dispatch sourcerer events until the status is ready - for the new picker
    if (status !== 'ready') {
      return;
    }

    onSourcererChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataViewId, selectedPatterns, status]);

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    const exitFullScreenButton = containerElement.current?.querySelector<HTMLButtonElement>(
      EXIT_FULL_SCREEN_CLASS_NAME
    );

    if (exitFullScreenButton != null) {
      exitFullScreenButton.focus();
    } else {
      containerElement.current
        ?.querySelector<HTMLButtonElement>('.globalFilterBar__addButton')
        ?.focus();
    }
  }, [containerElement]);

  const onSkipFocusAfterEventsTable = useCallback(() => {
    containerElement.current
      ?.querySelector<HTMLButtonElement>(`.${EVENTS_COUNT_BUTTON_CLASS_NAME}`)
      ?.focus();
  }, [containerElement]);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isTab(keyboardEvent)) {
        onTimelineTabKeyPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          onSkipFocusBeforeEventsTable,
          onSkipFocusAfterEventsTable,
        });
      }
    },
    [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
  );
  const timelineContext = useMemo(() => ({ timelineId }), [timelineId]);
  const resolveConflictComponent = useResolveConflict();

  return (
    <TimelineContext.Provider value={timelineContext}>
      <TimelineContainer
        data-test-subj="timeline"
        data-timeline-id={timelineId}
        onKeyDown={onKeyDown}
        ref={containerElement}
      >
        <TimelineSavingProgress timelineId={timelineId} />
        <TimelineBody data-test-subj="timeline-body">
          {timelineType === TimelineTypeEnum.template && (
            <EuiPanel color="accent" grow={false} paddingSize="s">
              <EuiText size="xs" color="accent">
                {i18n.TIMELINE_TEMPLATE}
              </EuiText>
            </EuiPanel>
          )}
          {resolveConflictComponent}
          <HideShowContainer
            $isVisible={!timelineFullScreen}
            data-test-subj="timeline-hide-show-container"
          >
            <TimelineModalHeader timelineId={timelineId} openToggleRef={openToggleRef} />
          </HideShowContainer>

          <TabsContent
            renderCellValue={renderCellValue}
            rowRenderers={rowRenderers}
            timelineId={timelineId}
            timelineType={timelineType}
            timelineDescription={description}
            timelineFullScreen={timelineFullScreen}
          />
        </TimelineBody>
      </TimelineContainer>
    </TimelineContext.Provider>
  );
};

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

export const StatefulTimeline = React.memo(StatefulTimelineComponent);
