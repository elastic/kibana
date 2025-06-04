/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiLoadingSpinner } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import styled, { css } from 'styled-components';
import { dataTableSelectors, tableDefaults } from '@kbn/securitysolution-data-table';
import {
  getScopedActions,
  isActiveTimeline,
  isInTableScope,
  isTimelineScope,
} from '../../../helpers';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { InputsModelId } from '../../../common/store/inputs/constants';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../common/containers/use_full_screen';
import { inputsActions } from '../../../common/store/actions';
import { Resolver } from '../../../resolver/view';
import { useTimelineDataFilters } from '../../containers/use_timeline_data_filters';
import { timelineSelectors } from '../../store';
import { timelineDefaults } from '../../store/defaults';
import { isFullScreen } from '../timeline/helpers';

const OverlayStyle = css`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
`;

const OverlayContainer = styled.div`
  ${OverlayStyle}
`;

const FullScreenOverlayStyles = css`
  background-color: ${({ theme }) => `${theme.eui.euiColorEmptyShade};`}
  position: fixed;
  top: 0;
  bottom: 2em;
  left: 0;
  right: 0;
  z-index: 3000;
`;

const FullScreenOverlayContainer = styled.div`
  ${FullScreenOverlayStyles}
`;

const StyledResolver = styled(Resolver)`
  height: 100%;
`;

interface GraphOverlayProps {
  scopeId: string;
  Navigation: JSX.Element | null;
}

const GraphOverlayComponent: React.FC<GraphOverlayProps> = ({ Navigation, scopeId }) => {
  const dispatch = useDispatch();
  const { globalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen } = useTimelineFullScreen();

  const getScope = useMemo(() => {
    if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    } else if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    }
  }, [scopeId]);

  const defaults = isInTableScope(scopeId) ? tableDefaults : timelineDefaults;

  const { graphEventId } = useDeepEqualSelector(
    (state) => (getScope && getScope(state, scopeId)) ?? defaults
  );

  const fullScreen = useMemo(
    () =>
      isFullScreen({
        globalFullScreen,
        isActiveTimelines: isActiveTimeline(scopeId),
        timelineFullScreen,
      }),
    [globalFullScreen, scopeId, timelineFullScreen]
  );

  useEffect(() => {
    return () => {
      const scopedActions = getScopedActions(scopeId);
      if (scopedActions) {
        dispatch(scopedActions.updateGraphEventId({ id: scopeId, graphEventId: '' }));
      }
      if (isActiveTimeline(scopeId)) {
        dispatch(inputsActions.setFullScreen({ id: InputsModelId.timeline, fullScreen: false }));
      } else {
        dispatch(inputsActions.setFullScreen({ id: InputsModelId.global, fullScreen: false }));
      }
    };
  }, [dispatch, scopeId]);

  const { from, to, shouldUpdate, selectedPatterns } = useTimelineDataFilters(
    isActiveTimeline(scopeId)
  );
  const filters = useMemo(() => {
    return { from, to };
  }, [from, to]);

  const resolver = useMemo(
    () =>
      graphEventId !== undefined ? (
        <StyledResolver
          databaseDocumentID={graphEventId}
          resolverComponentInstanceID={scopeId}
          indices={selectedPatterns}
          shouldUpdate={shouldUpdate}
          filters={filters}
        />
      ) : (
        <EuiFlexGroup alignItems="center" justifyContent="center" css={{ height: '100%' }}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      ),
    [graphEventId, scopeId, selectedPatterns, shouldUpdate, filters]
  );

  if (fullScreen && !isActiveTimeline(scopeId)) {
    return (
      <FullScreenOverlayContainer data-test-subj="overlayContainer">
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        {resolver}
      </FullScreenOverlayContainer>
    );
  } else {
    return (
      <OverlayContainer data-test-subj="overlayContainer">
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        {resolver}
      </OverlayContainer>
    );
  }
};

export const GraphOverlay = React.memo(GraphOverlayComponent);
