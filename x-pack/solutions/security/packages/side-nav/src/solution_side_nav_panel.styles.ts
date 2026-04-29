/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transparentize, type EuiThemeComputed, euiFontSize, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

const EUI_HEADER_HEIGHT = '96px';
const PANEL_LEFT_OFFSET = '249px';
const PANEL_WIDTH = '270px';

export const panelClassName = 'solutionSideNavPanel';
export const SolutionSideNavPanelStyles = (
  euiTheme: EuiThemeComputed<{}>,
  { $bottomOffset, $topOffset }: { $bottomOffset?: string; $topOffset?: string } = {}
) => css`
  position: fixed;
  top: ${$topOffset ?? EUI_HEADER_HEIGHT};
  left: ${PANEL_LEFT_OFFSET};
  bottom: 0;
  width: ${PANEL_WIDTH};
  height: inherit;
  z-index: 1000;
  background-color: ${euiTheme.colors.body};

  // If the bottom bar is visible add padding to the navigation
  ${$bottomOffset != null &&
  `
      height: inherit;
      bottom: ${$bottomOffset};
      box-shadow:
        // left
        -${euiTheme.size.s} 0 ${euiTheme.size.s} -${euiTheme.size.s} rgb(0 0 0 / 15%),
        // right
        ${euiTheme.size.s} 0 ${euiTheme.size.s} -${euiTheme.size.s} rgb(0 0 0 / 15%),
        // bottom inset to match timeline bar top shadow
        inset 0 -6px ${euiTheme.size.xs} -${euiTheme.size.xs} rgb(0 0 0 / 15%);
      `}
`;

export const SolutionSideNavPanelItemStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  &:focus-within {
    background-color: transparent;
    a {
      text-decoration: auto;
    }
  }
  &:hover {
    background-color: ${transparentize(euiTheme.colors.lightShade, 0.5)};
    a {
      text-decoration: underline;
    }
  }
`;

export const SolutionSideNavTitleStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  padding-top: ${euiTheme.size.s};
`;

export const SolutionSideNavCategoryTitleStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  text-transform: uppercase;
  color: ${euiTheme.colors.darkShade};
  padding-left: ${euiTheme.size.s};
  padding-bottom: ${euiTheme.size.s};
  ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xxs')}
  font-weight: ${euiTheme.font.weight.medium};
`;

export const SolutionSideNavPanelLinksGroupStyles = () => css`
  padding-left: 0;
  padding-right: 0;
`;

export const accordionButtonClassName = 'solutionSideNavPanelAccordion__button';
export const SolutionSideNavCategoryAccordionStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  .${accordionButtonClassName} {
    font-weight: ${euiTheme.font.weight.bold};
    ${euiFontSize({ euiTheme } as UseEuiTheme<{}>, 'xs')}
  }}
`;
