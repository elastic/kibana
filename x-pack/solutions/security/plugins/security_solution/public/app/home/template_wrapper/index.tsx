/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, useMemo, memo } from 'react';
import styled from 'styled-components';
import { EuiThemeProvider, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import { IS_DRAGGING_CLASS_NAME } from '@kbn/securitysolution-t-grid';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { ExpandableFlyoutProvider } from '@kbn/expandable-flyout';
import { AlertsContextProvider } from '../../../detections/components/alerts_table/alerts_context';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { SecuritySolutionFlyout, TimelineFlyout } from '../../../flyout';
import { useSecuritySolutionNavigation } from '../../../common/components/navigation/use_security_solution_navigation';
import { TimelineId } from '../../../../common/types/timeline';
import { getTimelineShowStatusByIdSelector } from '../../../timelines/store/selectors';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { GlobalKQLHeader } from './global_kql_header';
import { Timeline } from './timeline';
import { useShowTimeline } from '../../../common/utils/timeline/use_show_timeline';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { SecurityPageName } from '../../types';

/**
 * Need to apply the styles via a className to effect the containing bottom bar
 * rather than applying them to the timeline bar directly
 */
const StyledKibanaPageTemplate = styled(KibanaPageTemplate)<
  Omit<KibanaPageTemplateProps, 'ref'> & {
    $isShowingTimelineOverlay?: boolean;
    $addBottomPadding?: boolean;
    theme: EuiThemeComputed; // using computed EUI theme to be consistent with user profile theming
  }
>`
  .kbnSolutionNav__sidebar:not(.kbnSolutionNav__sidebar--shrink) {
    background-color: ${({ theme }) => theme.colors.emptyShade};
  }

    .${IS_DRAGGING_CLASS_NAME} & {
      // When a drag is in process the bottom flyout should slide up to allow a drop
      transform: none;
    }
  }
`;

export type SecuritySolutionTemplateWrapperProps = Omit<KibanaPageTemplateProps, 'ref'> & {
  /**
   * Combined with isEmptyState, this prop allows complete override of the empty page
   */
  emptyPageBody?: ReactNode;
};

export const SecuritySolutionTemplateWrapper: React.FC<SecuritySolutionTemplateWrapperProps> = memo(
  ({ children, ...rest }) => {
    const solutionNavProps = useSecuritySolutionNavigation();
    const [isTimelineBottomBarVisible] = useShowTimeline();
    const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
    const { show: isShowingTimelineOverlay } = useDeepEqualSelector((state) =>
      getTimelineShowStatus(state, TimelineId.active)
    );
    const [routeProps] = useRouteSpy();
    const isPreview = routeProps?.pageName === SecurityPageName.rulesCreate;
    const { euiTheme, colorMode: globalColorMode } = useEuiTheme();

    const renderChildren = !rest.isEmptyState;

    const mainContent = useMemo(() => {
      return (
        <KibanaPageTemplate.Section
          className="securityPageWrapper"
          data-test-subj="pageContainer"
          paddingSize={rest.paddingSize ?? 'l'}
          alignment="top"
          component="div"
          grow={true}
        >
          <AlertsContextProvider>
            <ExpandableFlyoutProvider urlKey={isPreview ? undefined : URL_PARAM_KEY.flyout}>
              {children}
              <SecuritySolutionFlyout />
            </ExpandableFlyoutProvider>
          </AlertsContextProvider>
        </KibanaPageTemplate.Section>
      );
    }, [children, isPreview, rest.paddingSize]);

    const bottomBar = useMemo(() => {
      return isTimelineBottomBarVisible ? (
        <KibanaPageTemplate.BottomBar data-test-subj="timeline-bottom-bar-container">
          <EuiThemeProvider colorMode={globalColorMode}>
            <ExpandableFlyoutProvider urlKey={URL_PARAM_KEY.timelineFlyout}>
              <Timeline />
              <TimelineFlyout />
            </ExpandableFlyoutProvider>
          </EuiThemeProvider>
        </KibanaPageTemplate.BottomBar>
      ) : null;
    }, [isTimelineBottomBarVisible, globalColorMode]);

    const templateProps = useMemo(
      () => ({
        theme: euiTheme,
        $isShowingTimelineOverlay: isShowingTimelineOverlay,
        paddingSize: 'none' as const,
        solutionNav: solutionNavProps ?? undefined,
        restrictWidth: false,
        ...rest,
      }),
      [euiTheme, isShowingTimelineOverlay, solutionNavProps, rest]
    );

    return (
      <StyledKibanaPageTemplate {...templateProps}>
        {renderChildren && (
          <>
            <GlobalKQLHeader />
            {mainContent}
            {bottomBar}
          </>
        )}
      </StyledKibanaPageTemplate>
    );
  }
);

SecuritySolutionTemplateWrapper.displayName = 'SecuritySolutionTemplateWrapper';
