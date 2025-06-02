/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { dataTableSelectors, tableDefaults } from '@kbn/securitysolution-data-table';
import {
  getScopedActions,
  isActiveTimeline,
  isInTableScope,
  isTimelineScope,
} from '../../../../../helpers';
import * as i18n from './translations';
import { TimelineTabs } from '../../../../../../common/types/timeline';
import { SCROLLING_DISABLED_CLASS_NAME } from '../../../../../../common/constants';
import { EXIT_FULL_SCREEN } from '../../../../../common/components/exit_full_screen/translations';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../../../common/containers/use_full_screen';
import { timelineSelectors } from '../../../../store';
import { timelineDefaults } from '../../../../store/defaults';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { isFullScreen } from '../../helpers';

interface NavigationProps {
  fullScreen: boolean;
  globalFullScreen: boolean;
  onCloseOverlay: () => void;
  isActiveTimelines: boolean;
  timelineFullScreen: boolean;
  toggleFullScreen: () => void;
  graphEventId?: string;
  activeTab?: TimelineTabs;
}

const NavigationComponent: React.FC<NavigationProps> = ({
  fullScreen,
  globalFullScreen,
  onCloseOverlay,
  isActiveTimelines,
  timelineFullScreen,
  toggleFullScreen,
  graphEventId,
  activeTab,
}) => {
  const { euiTheme } = useEuiTheme();

  const title = () => {
    if (isActiveTimelines) {
      return activeTab === TimelineTabs.graph ? i18n.CLOSE_ANALYZER : i18n.CLOSE_SESSION;
    } else {
      return graphEventId ? i18n.CLOSE_ANALYZER : i18n.CLOSE_SESSION;
    }
  };
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="cross"
          onClick={onCloseOverlay}
          size="xs"
          data-test-subj="close-overlay"
        >
          {title()}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {!isActiveTimelines && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : i18n.FULL_SCREEN}>
            <EuiButtonIcon
              aria-label={
                isFullScreen({
                  globalFullScreen,
                  isActiveTimelines,
                  timelineFullScreen,
                })
                  ? EXIT_FULL_SCREEN
                  : i18n.FULL_SCREEN
              }
              display={fullScreen ? 'fill' : 'empty'}
              color="primary"
              data-test-subj="full-screen"
              iconType="fullScreen"
              onClick={toggleFullScreen}
              css={css`
                margin: ${euiTheme.size.xs} 0;
              `}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
NavigationComponent.displayName = 'NavigationComponent';

const Navigation = React.memo(NavigationComponent);

export const useSessionViewNavigation = ({ scopeId }: { scopeId: string }) => {
  const dispatch = useDispatch();
  const getScope = useMemo(() => {
    if (isTimelineScope(scopeId)) {
      return timelineSelectors.getTimelineByIdSelector();
    } else if (isInTableScope(scopeId)) {
      return dataTableSelectors.getTableByIdSelector();
    }
  }, [scopeId]);
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();

  const defaults = isTimelineScope(scopeId) ? timelineDefaults : tableDefaults;
  const { graphEventId, activeTab } = useDeepEqualSelector((state) => ({
    activeTab: timelineDefaults.activeTab,
    prevActiveTab: timelineDefaults.prevActiveTab,
    ...((getScope && getScope(state, scopeId)) ?? defaults),
  }));

  const scopedActions = getScopedActions(scopeId);
  const onCloseOverlay = useCallback(() => {
    const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
    // Since EUI changes these values directly as a side effect, need to add them back on close.
    if (isDataGridFullScreen) {
      if (isActiveTimeline(scopeId)) {
        document.body.classList.add('euiDataGrid__restrictBody');
      } else {
        document.body.classList.add(SCROLLING_DISABLED_CLASS_NAME, 'euiDataGrid__restrictBody');
      }
    } else {
      if (isActiveTimeline(scopeId)) {
        setTimelineFullScreen(false);
      } else {
        setGlobalFullScreen(false);
      }
    }
    if (isActiveTimeline(scopeId) === false) {
      if (scopedActions) {
        dispatch(scopedActions.updateGraphEventId({ id: scopeId, graphEventId: '' }));
      }
    } else {
      if (activeTab === TimelineTabs.graph) {
        if (scopedActions) {
          dispatch(scopedActions.updateGraphEventId({ id: scopeId, graphEventId: '' }));
        }
      }
    }
  }, [setTimelineFullScreen, setGlobalFullScreen, scopedActions, dispatch, scopeId, activeTab]);

  const fullScreen = useMemo(
    () =>
      isFullScreen({
        globalFullScreen,
        isActiveTimelines: isActiveTimeline(scopeId),
        timelineFullScreen,
      }),
    [globalFullScreen, scopeId, timelineFullScreen]
  );

  const toggleFullScreen = useCallback(() => {
    if (isActiveTimeline(scopeId)) {
      setTimelineFullScreen(!timelineFullScreen);
    } else {
      setGlobalFullScreen(!globalFullScreen);
    }
  }, [scopeId, setTimelineFullScreen, timelineFullScreen, setGlobalFullScreen, globalFullScreen]);

  const navigation = useMemo(() => {
    return (
      <Navigation
        fullScreen={fullScreen}
        globalFullScreen={globalFullScreen}
        activeTab={activeTab}
        onCloseOverlay={onCloseOverlay}
        isActiveTimelines={isActiveTimeline(scopeId)}
        timelineFullScreen={timelineFullScreen}
        toggleFullScreen={toggleFullScreen}
        graphEventId={graphEventId}
      />
    );
  }, [
    fullScreen,
    globalFullScreen,
    activeTab,
    onCloseOverlay,
    scopeId,
    timelineFullScreen,
    toggleFullScreen,
    graphEventId,
  ]);

  return {
    onCloseOverlay,
    Navigation: navigation,
  };
};
