/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import styled from '@emotion/styled';
import { noop } from 'lodash/fp';
import React, { memo, useRef } from 'react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { PAGE_TITLE } from '../../pages/attacks/translations';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { useGlobalFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../explore/hosts/pages/display';
import { SearchBarSection } from '../common/search_bar/search_bar_section';

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
   * DataView for the alerts page
   */
  dataView: DataView;
  // TODO remove when we remove the newDataViewPickerEnabled feature flag
  /**
   * DataViewSpec used to fetch the alerts data when the newDataViewPickerEnabled feature flag is false
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

    return (
      <StyledFullHeightContainer data-test-subj={CONTENT_TEST_ID} ref={containerElement}>
        <EuiWindowEvent event="resize" handler={noop} />
        <SearchBarSection dataView={dataView} sourcererDataViewSpec={oldSourcererDataViewSpec} />
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
