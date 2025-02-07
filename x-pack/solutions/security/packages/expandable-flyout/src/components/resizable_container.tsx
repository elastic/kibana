/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiResizableContainer } from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { changeUserSectionWidthsAction } from '../store/actions';
import {
  selectDefaultWidths,
  selectPushVsOverlay,
  selectUserSectionWidths,
  useDispatch,
  useSelector,
} from '../store/redux';
import {
  RESIZABLE_BUTTON_TEST_ID,
  RESIZABLE_LEFT_SECTION_TEST_ID,
  RESIZABLE_RIGHT_SECTION_TEST_ID,
} from './test_ids';
import { LeftSection } from './left_section';
import { RightSection } from './right_section';

const MIN_SECTION_WIDTH = '380px';
const LEFT_PANEL_ID = 'left';
const RIGHT_PANEL_ID = 'right';

interface ResizableContainerProps {
  /**
   * The component to render on the left side of the flyout
   */
  leftComponent: React.ReactElement;
  /**
   * The component to render on the right side of the flyout
   */
  rightComponent: React.ReactElement;
  /**
   * If the left section is not shown we disable the resize button and hide the left size of the resizable panel
   */
  showLeft: boolean;
  /**
   * If the preview section is shown we disable the resize button
   */
  showPreview: boolean;
}

/**
 * Component that renders the left and right section when the flyout is in expanded mode.
 * It allows the resizing of the sections, saving the percentages in local storage.
 */
export const ResizableContainer: React.FC<ResizableContainerProps> = memo(
  ({ leftComponent, rightComponent, showLeft, showPreview }: ResizableContainerProps) => {
    const dispatch = useDispatch();

    const { leftPercentage, rightPercentage } = useSelector(selectUserSectionWidths);
    const type = useSelector(selectPushVsOverlay);
    const defaultPercentages = useSelector(selectDefaultWidths);

    const initialLeftPercentage = useMemo(
      () => (showLeft ? leftPercentage || defaultPercentages[type].leftPercentage : 0),
      [defaultPercentages, leftPercentage, showLeft, type]
    );
    const initialRightPercentage = useMemo(
      () => (showLeft ? rightPercentage || defaultPercentages[type].rightPercentage : 100),
      [defaultPercentages, rightPercentage, showLeft, type]
    );

    const onWidthChange = useCallback(
      (newSizes: { [key: string]: number }) =>
        dispatch(
          changeUserSectionWidthsAction({
            ...(newSizes as { left: number; right: number }),
            savedToLocalStorage: true,
          })
        ),
      [dispatch]
    );

    return (
      <EuiResizableContainer
        css={css`
          height: 100%;
        `}
        onPanelWidthChange={onWidthChange}
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              id={LEFT_PANEL_ID}
              initialSize={initialLeftPercentage}
              paddingSize="none"
              minSize={MIN_SECTION_WIDTH}
              data-test-subj={RESIZABLE_LEFT_SECTION_TEST_ID}
            >
              <LeftSection component={leftComponent} />
            </EuiResizablePanel>
            <EuiResizableButton
              disabled={showPreview || !showLeft}
              data-test-subj={RESIZABLE_BUTTON_TEST_ID}
            />
            <EuiResizablePanel
              id={RIGHT_PANEL_ID}
              initialSize={initialRightPercentage}
              minSize={MIN_SECTION_WIDTH}
              paddingSize="none"
              data-test-subj={RESIZABLE_RIGHT_SECTION_TEST_ID}
            >
              <RightSection component={rightComponent} />
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    );
  }
);

ResizableContainer.displayName = 'ResizableContainer';
