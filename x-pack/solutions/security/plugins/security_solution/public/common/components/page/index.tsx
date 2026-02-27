/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ComponentProps, FC } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiBadge, EuiDescriptionList, EuiFlexGroup, EuiIcon, useEuiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

export const SecuritySolutionAppWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  width: 100%;
`;
SecuritySolutionAppWrapper.displayName = 'SecuritySolutionAppWrapper';

/**
 * Stylesheet for Eui class overrides for components that may be displayed when content
 * on the page has been set to display in full screen mode. It ensures that certain Eui
 * components, that position themselves just below the kibana header, are displayed correctly
 * when shown above content that is set to `full screen`.
 */
export const FULL_SCREEN_CONTENT_OVERRIDES_CSS_STYLESHEET = `
  .euiOverlayMask[data-relative-to-header='below'] {
    top: 0 !important;
  }

  .euiFlyout {
    top: 0 !important;
    height: 100% !important;
  }
`;

/*
  SIDE EFFECT: the following `appGlobalStyles` overrides default styling in angular code that was not theme-friendly
  and `EuiPopover`, `EuiToolTip` global styles
*/
export const appGlobalStyles = ({ euiTheme }: UseEuiTheme): string => `
  /*
    overrides the default styling of EuiDataGrid expand popover footer to
    make it a column of actions instead of the default actions row
  */
  .euiDataGridRowCell__popover {
    max-width: 815px !important;
    max-height: none !important;
    overflow: hidden;

    .expandable-top-value-button {
      &.euiButtonEmpty:focus {
        background-color: transparent;
      }
    }

    &.euiPopover__panel[data-popover-open] {
      padding: 8px 0;
      min-width: 65px;
    }

    .euiPopoverFooter {
      border: 0;
      margin-top: 0;
      .euiFlexGroup {
        flex-direction: column;
      }
    }

    .euiText + .euiPopoverFooter {
      border-top: 1px solid ${euiTheme.colors.lightShade};
      margin-top: ${euiTheme.size.s};
    }
  }

  /* overrides default styling in angular code that was not theme-friendly */
  .euiPanel-loading-hide-border {
    border: none;
  }

  /* hide open draggable popovers when a modal is being displayed to prevent them from covering the modal */
  body.euiBody-hasOverlayMask {
    .euiDataGridRowCell__popover[data-popover-open],
    .withHoverActions__popover[data-popover-open] {
      visibility: hidden !important;
    }
  }

  /*
     EuiScreenReaderOnly has a default 1px height and width. These extra pixels
     were adding additional height to every table row in the alerts table on the
     Detections page. As a result of this extra height, the Detections page was
     displaying unnecessary scroll bars and unnecessary empty space bellow the
     alerts table. Thus, we set the height and width of all EuiScreenReaderOnly
     to zero.
  */
  .euiScreenReaderOnly {
    clip: rect(1px, 1px, 1px, 1px);
    clip-path: inset(50%);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
`;

export const DescriptionListStyled: FC<ComponentProps<typeof EuiDescriptionList>> = memo(
  ({ css: cssProp, ...props }) => {
    const baseStyles = css`
      word-break: break-word;
      dt {
        font-size: ${useEuiFontSize('xs').fontSize} !important;
      }
      dd {
        width: fit-content;
      }
      dd > div {
        width: fit-content;
      }
    `;

    return <EuiDescriptionList css={[baseStyles, cssProp]} {...props} />;
  }
);

DescriptionListStyled.displayName = 'DescriptionListStyled';

export const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

CountBadge.displayName = 'CountBadge';

export const Spacer = styled.span`
  margin-left: 5px;
`;

Spacer.displayName = 'Spacer';

export const Badge = styled(EuiBadge)`
  vertical-align: top;
` as unknown as typeof EuiBadge;

Badge.displayName = 'Badge';

export const MoreRowItems = styled(EuiIcon)`
  margin-left: 5px;
`;

MoreRowItems.displayName = 'MoreRowItems';

export const OverviewWrapper = styled(EuiFlexGroup)`
  position: relative;

  .euiButtonIcon {
    position: absolute;
    right: ${({ theme }) => theme.euiTheme.size.m};
    top: 6px;
    z-index: 2;
  }
`;

OverviewWrapper.displayName = 'OverviewWrapper';
