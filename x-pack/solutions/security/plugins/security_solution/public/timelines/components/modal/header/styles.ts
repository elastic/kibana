/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { EuiPanel } from '@elastic/eui';

export const whiteSpaceNoWrapCSS = { 'white-space': 'nowrap' };
export const autoOverflowXCSS = { 'overflow-x': 'auto' };

export const VerticalDivider = euiStyled.span`
  width: 0;
  height: 20px;
  border-left: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
`;

export const TimelinePanel = euiStyled(EuiPanel)`
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  color: ${(props) => props.theme.eui.euiTextColor};
  padding-inline: ${(props) => props.theme.eui.euiSizeM};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
`;
