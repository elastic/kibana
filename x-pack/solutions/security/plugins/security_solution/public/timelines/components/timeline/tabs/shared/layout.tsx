/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlyoutHeader, EuiBadge } from '@elastic/eui';
import styled from 'styled-components';

export const TabHeaderContainer = styled.div`
  width: 100%;
`;

TabHeaderContainer.displayName = 'TimelineHeaderContainer';

export const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: stretch;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: scroll;

  &.euiFlyoutHeader {
    ${({ theme }) => `padding: ${theme.eui.euiSizeS} 0 0 0;`}
  }
`;

export const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

export const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

VerticalRule.displayName = 'VerticalRule';

export const EventsCountBadge = styled(EuiBadge)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;
