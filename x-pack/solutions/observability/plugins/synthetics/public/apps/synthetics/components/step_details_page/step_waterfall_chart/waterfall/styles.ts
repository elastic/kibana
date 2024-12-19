/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { rgba } from 'polished';
import styled from '@emotion/styled';
import { FIXED_AXIS_HEIGHT, CHART_HEADER_HEIGHT } from './constants';

interface WaterfallChartOuterContainerProps {
  height?: string;
}

const StyledScrollDiv = styled.div`
  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.euiTheme.size.base};
    width: ${({ theme }) => theme.euiTheme.size.base};
  }
  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.euiTheme.colors.darkShade, 0.5)};
    border: ${({ theme }) => theme.euiTheme.border.radius.small} solid transparent;
  }
  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

export const WaterfallChartOuterContainer = styled(
  StyledScrollDiv
)<WaterfallChartOuterContainerProps>`
  height: auto;
  overflow: hidden;
  z-index: 50;
`;

export const WaterfallChartStickyHeaderContainer = styled(StyledScrollDiv)`
  position: sticky;
  top: 96px;
  z-index: ${(props) => props.theme.eui.euiZLevel5 + 10};
  overflow: visible;
  min-height: ${CHART_HEADER_HEIGHT}px;
  border-color: ${(props) => props.theme.eui.euiColorLightShade};
  border-top: ${(props) => props.theme.eui.euiBorderThin};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  padding: ${(props) => props.theme.eui.euiSizeL};
  padding-bottom: ${(props) => props.theme.eui.euiSizeXL};
  padding-left: ${(props) => props.theme.eui.euiSizeM};
`;

export const WaterfallChartStickyFooterContainer = styled(StyledScrollDiv)`
  position: sticky;
  bottom: 0px;
  z-index: ${(props) => props.theme.eui.euiZLevel5};
  overflow: visible;
  border-color: ${(props) => props.theme.eui.euiColorLightShade};
  border-top: ${(props) => props.theme.eui.euiBorderThin};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  padding: ${(props) => props.theme.eui.euiSizeM};
`;

export const WaterfallChartTimeTicksContainer = styled(StyledScrollDiv)`
  z-index: ${(props) => props.theme.eui.euiZLevel6};
  overflow: hidden;
  position: absolute;
  left: 0;
  bottom: -10px;
  width: 100%;
  height: auto;
  border: none;
  background: transparent;
`;

export const WaterfallChartFixedAxisContainer = styled.div`
  z-index: ${(props) => Number(props.theme.euiTheme.levels.menu) + 2000};
  height: 100%;
  &&& {
    .echAnnotation__icon {
      top: 8px;
    }
  }
`;

export const WaterfallChartSidebarWrapper = styled(EuiFlexItem)`
  z-index: ${(props) => Number(props.theme.euiTheme.levels.menu) + 2000};
  min-width: 0;
`; // NOTE: min-width: 0 ensures flexbox and no-wrap children can co-exist

export const SideBarItemHighlighter = styled(EuiFlexItem)`
  height: 100%;
  .euiButtonEmpty {
    height: ${FIXED_AXIS_HEIGHT}px;
    font-size: ${({ theme }) => theme.eui.euiFontSizeM};
  }
`;

interface WaterfallChartChartContainer {
  height: number;
  chartIndex: number;
}

export const WaterfallChartChartContainer = styled.div<WaterfallChartChartContainer>`
  width: 100%;
  height: ${(props) => `${props.height + FIXED_AXIS_HEIGHT + 4}px`};
  margin-top: -${FIXED_AXIS_HEIGHT + 4}px;
  z-index: ${(props) => Math.round(props.theme.eui.euiZLevel3 / (props.chartIndex + 1))};
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};

  &&& {
    .echCanvasRenderer {
      height: calc(100% + 0px) !important;
    }
  }
`;

export const WaterfallTooltipResponsiveMaxWidth = styled.div`
  max-width: 90vw;
`;

export const WaterfallChartTooltip = styled(WaterfallTooltipResponsiveMaxWidth)`
  background-color: ${({ theme: { eui, darkMode } }) =>
    darkMode ? eui.euiColorDarkestShade : eui.euiColorEmptyShade};
  border-radius: ${(props) => props.theme.eui.euiBorderRadius};
  color: ${({ theme: { eui, darkMode } }) =>
    !darkMode ? eui.euiColorDarkestShade : eui.euiColorLightestShade};
  padding: ${(props) => props.theme.eui.euiSizeS};
  .euiToolTip__arrow {
    background-color: ${({ theme: { eui, darkMode } }) =>
      darkMode ? eui.euiColorDarkestShade : eui.euiColorEmptyShade};
  }
`;
