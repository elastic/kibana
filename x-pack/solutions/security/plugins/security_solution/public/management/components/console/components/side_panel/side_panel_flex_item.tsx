/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from '@emotion/styled';
import { EuiFlexItem } from '@elastic/eui';
import { SidePanelContentManager } from './side_panel_content_manager';
import { useWithSidePanel } from '../../hooks/state_selectors/use_with_side_panel';

const StyledEuiFlexItemWhite = styled(EuiFlexItem)`
  background-color: ${({ theme: { euiTheme } }) => euiTheme.colors.backgroundBasePlain};
  border-radius: ${({ theme: { euiTheme } }) => `0 ${euiTheme.size.xs} ${euiTheme.size.xs} 0`};
  box-shadow: 0 ${({ theme: { euiTheme } }) => euiTheme.size.xs}
    ${({ theme: { euiTheme } }) => euiTheme.size.xs}
    ${({ theme: { euiTheme } }) => euiTheme.colors.borderBaseSubdued};
`;

export const SidePanelFlexItem = memo((props) => {
  const isPanelOpened = Boolean(useWithSidePanel().show);

  if (!isPanelOpened) {
    return null;
  }

  return (
    <StyledEuiFlexItemWhite grow={false} className="layout-rightPanel">
      <SidePanelContentManager />
    </StyledEuiFlexItemWhite>
  );
});
SidePanelFlexItem.displayName = 'SidePanelFlexItem';
