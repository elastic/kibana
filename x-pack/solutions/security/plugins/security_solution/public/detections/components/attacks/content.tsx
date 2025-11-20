/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import styled from '@emotion/styled';
import { noop } from 'lodash/fp';
import type { DataView } from '@kbn/data-views-plugin/common';

import { Schedule } from '../../../attack_discovery/pages/header/schedule';
import { PAGE_TITLE } from '../../pages/attacks/translations';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../explore/hosts/pages/display';
import { SearchBarSection } from './search_bar/search_bar_section';
import { SchedulesFlyout } from './schedule_flyout';

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
}

/**
 * Renders the content of the attacks page: search bar, header, filters, KPIs, and table sections.
 */
export const AttacksPageContent = React.memo(({ dataView }: AttacksPageContentProps) => {
  const containerElement = useRef<HTMLDivElement | null>(null);

  const { globalFullScreen } = useGlobalFullScreen();

  // showing / hiding the flyout:
  const [showFlyout, setShowFlyout] = useState<boolean>(false);
  const openFlyout = useCallback(() => {
    setShowFlyout(true);
  }, []);
  const onClose = useCallback(() => setShowFlyout(false), []);

  return (
    <StyledFullHeightContainer data-test-subj={CONTENT_TEST_ID} ref={containerElement}>
      <EuiWindowEvent event="resize" handler={noop} />
      <SearchBarSection dataView={dataView} />
      <SecuritySolutionPageWrapper
        noPadding={globalFullScreen}
        data-test-subj={SECURITY_SOLUTION_PAGE_WRAPPER_TEST_ID}
      >
        <Display show={!globalFullScreen}>
          <HeaderPage title={PAGE_TITLE}>
            <Schedule openFlyout={openFlyout} />
          </HeaderPage>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
        </Display>

        {showFlyout && <SchedulesFlyout onClose={onClose} />}
      </SecuritySolutionPageWrapper>
    </StyledFullHeightContainer>
  );
});
AttacksPageContent.displayName = 'AttacksPageContent';
