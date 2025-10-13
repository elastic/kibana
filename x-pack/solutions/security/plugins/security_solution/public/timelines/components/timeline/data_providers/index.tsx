/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch } from 'react-redux';
import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { v4 as uuidv4 } from 'uuid';
import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import { PageScope } from '../../../../data_view_manager/constants';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { DroppableWrapper } from '../../../../common/components/drag_and_drop/droppable_wrapper';
import { droppableTimelineProvidersPrefix } from '../../../../common/components/drag_and_drop/helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { Empty } from './empty';
import { Providers } from './providers';
import { timelineSelectors } from '../../../store';
import { timelineDefaults } from '../../../store/defaults';
import * as i18n from './translations';
import { options } from '../search_or_filter/helpers';
import type { KqlMode } from '../../../store/model';
import { updateKqlMode } from '../../../store/actions';

interface Props {
  timelineId: string;
}

const DropTargetDataProvidersContainer = styled.div`
  position: relative;

  .${IS_DRAGGING_CLASS_NAME} & .drop-target-data-providers {
    background: ${({ theme }) => theme.euiTheme.colors.backgroundBaseSuccess};
    border: 0.2rem dashed ${({ theme }) => theme.euiTheme.colors.borderStrongSuccess};

    & .timeline-drop-area-empty__text {
      color: ${({ theme }) => theme.euiTheme.colors.textSuccess};
    }

    & .euiFormHelpText {
      color: ${({ theme }) => theme.euiTheme.colors.textSuccess};
    }
  }
`;

const DropTargetDataProviders = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  border: 0.2rem dashed ${({ theme }) => theme.euiTheme.colors.borderBaseProminent};
  border-radius: 5px;
  padding: ${({ theme }) => theme.euiTheme.size.s} 0;
  margin: 0px 0 0px 0;
  max-height: 33vh;
  min-height: 100px;
  overflow: auto;
  resize: vertical;
  background-color: ${({ theme }) => theme.euiTheme.components.forms.background};
`;

DropTargetDataProviders.displayName = 'DropTargetDataProviders';

const getDroppableId = (id: string): string =>
  `${droppableTimelineProvidersPrefix}${id}${uuidv4()}`;

/**
 * Renders the data providers section of the timeline.
 *
 * The data providers section is a drop target where users
 * can drag-and drop new data providers into the timeline.
 *
 * It renders an interactive card representation of the
 * data providers. It also provides uniform
 * UI controls for the following actions:
 * 1) removing a data provider
 * 2) temporarily disabling a data provider
 * 3) applying boolean negation to the data provider
 *
 * Given an empty collection of DataProvider[], it prompts
 * the user to drop anything with a facet count into
 * the data pro section.
 */

const timelineSelectModeItemsClassName = 'timelineSelectModeItemsClassName';

const searchOrFilterPopoverClassName = 'searchOrFilterPopover';
const searchOrFilterPopoverWidth = 350;

const popoverProps = {
  className: searchOrFilterPopoverClassName,
  panelClassName: searchOrFilterPopoverClassName,
  panelMinWidth: searchOrFilterPopoverWidth,
};

const CustomTooltipDiv = styled.div`
  position: relative;
`;

export const DataProviders = React.memo<Props>(({ timelineId }) => {
  const dispatch = useDispatch();

  const browserFields = useBrowserFields(PageScope.timeline);

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const dataProviders = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).dataProviders
  );
  const droppableId = useMemo(() => getDroppableId(timelineId), [timelineId]);

  const kqlMode = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).kqlMode
  );

  const handleChange = useCallback(
    (mode: KqlMode) => {
      dispatch(updateKqlMode({ id: timelineId, kqlMode: mode }));
    },
    [timelineId, dispatch]
  );

  return (
    <>
      <DropTargetDataProvidersContainer
        aria-label={i18n.QUERY_AREA_ARIA_LABEL}
        className="drop-target-data-providers-container"
      >
        <EuiFlexGroup direction={'row'} justifyContent="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <CustomTooltipDiv>
              <EuiToolTip
                className="timeline-select-search-filter-tooltip"
                content={i18n.FILTER_OR_SEARCH_WITH_KQL}
                disableScreenReaderOutput
              >
                <EuiSuperSelect
                  aria-label={i18n.FILTER_OR_SEARCH_WITH_KQL}
                  className="timeline-select-search-or-filter"
                  data-test-subj="timeline-select-search-or-filter"
                  hasDividers={true}
                  itemLayoutAlign="top"
                  itemClassName={timelineSelectModeItemsClassName}
                  onChange={handleChange}
                  options={options}
                  popoverProps={popoverProps}
                  valueOfSelected={kqlMode}
                />
              </EuiToolTip>
            </CustomTooltipDiv>
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <DropTargetDataProviders
              className="drop-target-data-providers"
              data-test-subj="dataProviders"
            >
              {dataProviders != null && dataProviders.length ? (
                <Providers
                  browserFields={browserFields}
                  timelineId={timelineId}
                  dataProviders={dataProviders}
                />
              ) : (
                <DroppableWrapper droppableId={droppableId}>
                  <Empty browserFields={browserFields} timelineId={timelineId} />
                </DroppableWrapper>
              )}
            </DropTargetDataProviders>
          </EuiFlexItem>
        </EuiFlexGroup>
      </DropTargetDataProvidersContainer>
    </>
  );
});

DataProviders.displayName = 'DataProviders';
