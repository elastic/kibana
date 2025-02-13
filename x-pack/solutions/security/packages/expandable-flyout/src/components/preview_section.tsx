/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { has } from 'lodash';
import {
  selectDefaultWidths,
  selectPushVsOverlay,
  selectUserSectionWidths,
  useSelector,
} from '../store/redux';
import {
  PREVIEW_SECTION_BACK_BUTTON_TEST_ID,
  PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID,
  PREVIEW_SECTION_HEADER_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
} from './test_ids';
import { useExpandableFlyoutApi } from '../..';
import { BACK_BUTTON, CLOSE_BUTTON } from './translations';

export interface PreviewBanner {
  /**
   * Optional title to be shown
   */
  title?: string;
  /**
   * Optional string for background color
   */
  backgroundColor?:
    | 'primary'
    | 'plain'
    | 'warning'
    | 'accent'
    | 'success'
    | 'danger'
    | 'transparent'
    | 'subdued';
  /**
   * Optional string for text color
   */
  textColor?: string;
}

/**
 * Type guard to check the passed object is of preview banner type
 * @param banner passed from panel params
 * @returns a boolean to indicate whether the banner passed is a preview banner
 */
export const isPreviewBanner = (banner: unknown): banner is PreviewBanner => {
  return has(banner, 'title') || has(banner, 'backgroundColor') || has(banner, 'textColor');
};

interface PreviewSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  /**
   * Preview banner shown at the top of preview panel
   */
  banner?: PreviewBanner;
  /**
   * Flag to indicate whether the preview section is expanded, use to calculate the width of the section
   */
  showExpanded: boolean;
}

/**
 * Preview section of the expanded flyout rendering one or multiple panels.
 * Will display a back and close button in the header for the previous and close feature respectively.
 */
export const PreviewSection: React.FC<PreviewSectionProps> = memo(
  ({ component, banner, showExpanded }: PreviewSectionProps) => {
    const { euiTheme } = useEuiTheme();
    const { closePreviewPanel, previousPreviewPanel } = useExpandableFlyoutApi();

    const { rightPercentage } = useSelector(selectUserSectionWidths);
    const defaultPercentages = useSelector(selectDefaultWidths);
    const type = useSelector(selectPushVsOverlay);

    // Calculate the width of the preview section based on the following
    // - if only the right section is visible, then we use 100% of the width (minus some padding)
    // - if both the right and left sections are visible, we use the width of the right section (minus the same padding)
    const width = useMemo(() => {
      const percentage = rightPercentage
        ? rightPercentage
        : defaultPercentages[type].rightPercentage;
      return showExpanded ? `calc(${percentage}% - 8px)` : `calc(100% - 8px)`;
    }, [defaultPercentages, rightPercentage, showExpanded, type]);

    const closeButton = (
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="cross"
          onClick={() => closePreviewPanel()}
          data-test-subj={PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID}
          aria-label={CLOSE_BUTTON}
        />
      </EuiFlexItem>
    );
    const header = (
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="arrowLeft"
            iconSide="left"
            onClick={() => previousPreviewPanel()}
            data-test-subj={PREVIEW_SECTION_BACK_BUTTON_TEST_ID}
            aria-label={BACK_BUTTON}
          >
            {BACK_BUTTON}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {closeButton}
      </EuiFlexGroup>
    );

    return (
      <div
        css={css`
          position: absolute;
          top: 8px;
          bottom: 8px;
          right: 4px;
          width: ${width};
          z-index: 1000;
        `}
      >
        <EuiSplitPanel.Outer
          css={css`
            margin: ${euiTheme.size.xs};
            box-shadow: 0 0 ${euiTheme.size.base} 0 ${euiTheme.colors.lightShade};
          `}
          data-test-subj={PREVIEW_SECTION_TEST_ID}
          className="eui-fullHeight"
        >
          {isPreviewBanner(banner) && (
            <EuiSplitPanel.Inner
              grow={false}
              color={banner.backgroundColor}
              paddingSize="xs"
              data-test-subj={`${PREVIEW_SECTION_TEST_ID}BannerPanel`}
            >
              <EuiText
                textAlign="center"
                color={banner.textColor}
                size="xs"
                data-test-subj={`${PREVIEW_SECTION_TEST_ID}BannerText`}
              >
                {banner.title}
              </EuiText>
            </EuiSplitPanel.Inner>
          )}
          <EuiSplitPanel.Inner
            grow={false}
            paddingSize="s"
            data-test-subj={PREVIEW_SECTION_HEADER_TEST_ID}
          >
            {header}
          </EuiSplitPanel.Inner>
          {component}
        </EuiSplitPanel.Outer>
      </div>
    );
  }
);

PreviewSection.displayName = 'PreviewSection';
