/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { OutPortal } from 'react-reverse-portal';
import { useGlobalHeaderPortal } from '../../../../common/hooks/use_global_header_portal';

export const GlobalKQLHeader = React.memo(() => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();
  const { euiTheme } = useEuiTheme();

  // Former euiZHeaderBelowDataGrid (header - 2). Dashboard TopNav stacking is isolated locally.
  const stickyStyles = css`
    position: sticky;
    z-index: ${Number(euiTheme.levels.header) - 2};
    top: var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0));
  `;

  return (
    <div id="securitySolutionStickyKQL" css={stickyStyles}>
      <OutPortal node={globalKQLHeaderPortalNode} />
    </div>
  );
});

GlobalKQLHeader.displayName = 'GlobalKQLHeader';
