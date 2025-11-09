/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import styled from '@emotion/styled';
import { noop } from 'lodash/fp';
import React, { memo, useCallback, useRef } from 'react';
import { isTab } from '@kbn/timelines-plugin/public';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { PAGE_TITLE } from '../../pages/attacks/translations';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../explore/hosts/pages/display';
import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
} from '../../../timelines/components/timeline/helpers';

export const CONTENT_TEST_ID = 'attacks-page-content';
export const SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID = 'attacks-page-security-solution-page-wrapper';

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

export interface AttacksPageContentProps {
  /**
   * DataView for the attacks page
   */
  dataView: DataView;
  // TODO remove when we remove the newDataViewPickerEnabled feature flag
  /**
   * DataViewSpec used to fetch the attacks data when the newDataViewPickerEnabled feature flag is false
   */
  oldSourcererDataViewSpec: DataViewSpec;
}

/**
 * Renders the content of the attacks page: search bar, header, filters, KPIs, and table sections.
 */
export const AttacksPageContent = memo(
  ({ dataView, oldSourcererDataViewSpec }: AttacksPageContentProps) => {
    const containerElement = useRef<HTMLDivElement | null>(null);

    const { globalFullScreen } = useGlobalFullScreen();

    const onSkipFocusBeforeEventsTable = useCallback(() => {
      focusUtilityBarAction(containerElement.current);
    }, [containerElement]);

    const onSkipFocusAfterEventsTable = useCallback(() => {
      resetKeyboardFocus();
    }, []);

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

    return (
      <StyledFullHeightContainer
        data-test-subj={CONTENT_TEST_ID}
        onKeyDown={onKeyDown}
        ref={containerElement}
      >
        <EuiWindowEvent event="resize" handler={noop} />
        <SecuritySolutionPageWrapper
          noPadding={globalFullScreen}
          data-test-subj={SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID}
        >
          <Display show={!globalFullScreen}>
            <HeaderPage title={PAGE_TITLE} />
            <EuiHorizontalRule margin="none" />
            <EuiSpacer size="l" />
          </Display>
        </SecuritySolutionPageWrapper>
      </StyledFullHeightContainer>
    );
  }
);

AttacksPageContent.displayName = 'AttacksPageContent';
