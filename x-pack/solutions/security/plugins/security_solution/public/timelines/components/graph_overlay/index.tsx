/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
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

const SESSION_VIEW_FULL_SCREEN = 'sessionViewFullScreen';

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

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `background-color: ${theme.eui.euiColorEmptyShade};`}
  overflow: hidden;
  width: 100%;

  &.${SESSION_VIEW_FULL_SCREEN} {
    ${({ theme }) => `padding: 0 ${theme.eui.euiSizeM}`}
  }
`;

interface GraphOverlayProps {
  scopeId: string;
  SessionView: JSX.Element | null;
  Navigation: JSX.Element | null;
}

const GraphOverlayComponent: React.FC<GraphOverlayProps> = ({
  SessionView,
  Navigation,
  scopeId,
}) => {
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

  const { graphEventId, sessionViewConfig } = useDeepEqualSelector(
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

  const sessionContainerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (fullScreen && sessionContainerRef.current) {
      sessionContainerRef.current.setAttribute('style', FullScreenOverlayStyles.join(''));
    } else if (sessionContainerRef.current) {
      sessionContainerRef.current.setAttribute('style', OverlayStyle.join(''));
    }
  }, [fullScreen]);

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
        <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexGroup>
      ),
    [graphEventId, scopeId, selectedPatterns, shouldUpdate, filters]
  );

  if (!isActiveTimeline(scopeId) && sessionViewConfig !== null) {
    return (
      <OverlayContainer data-test-subj="overlayContainer" ref={sessionContainerRef}>
        <EuiFlexGroup alignItems="flexStart" gutterSize="none" direction="column">
          <EuiHorizontalRule margin="none" />
          <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          <ScrollableFlexItem grow={2} className={fullScreen ? SESSION_VIEW_FULL_SCREEN : ''}>
            {SessionView}
          </ScrollableFlexItem>
        </EuiFlexGroup>
      </OverlayContainer>
    );
  } else if (fullScreen && !isActiveTimeline(scopeId)) {
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
