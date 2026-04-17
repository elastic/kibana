/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { InPortal } from 'react-reverse-portal';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { useGlobalHeaderPortal } from '../../hooks/use_global_header_portal';

export interface FiltersGlobalProps {
  children: React.ReactNode;
}

export const FiltersGlobal = React.memo<FiltersGlobalProps>(({ children }) => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();
  const { euiTheme } = useEuiTheme();

  const globalSearchBarStripPadding = useMemo(
    () => css`
      header .uniSearchBar {
        padding-top: ${euiTheme.size.m} !important;
        padding-bottom: 0 !important;
      }
    `,
    [euiTheme]
  );

  return (
    <InPortal node={globalKQLHeaderPortalNode}>
      <EuiPanel
        borderRadius="none"
        color="transparent"
        paddingSize="none"
        css={globalSearchBarStripPadding}
      >
        <header data-test-subj="filters-global-container">{children}</header>
      </EuiPanel>
    </InPortal>
  );
});

FiltersGlobal.displayName = 'FiltersGlobal';
