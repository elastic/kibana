/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { InPortal } from 'react-reverse-portal';
import { EuiPanel } from '@elastic/eui';
import { useGlobalHeaderPortal } from '../../hooks/use_global_header_portal';

/** Unified search `.uniSearchBar` adds vertical padding; strip it in the sticky global header slot. */
const globalSearchBarStripVerticalPadding = css`
  header .uniSearchBar {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
`;

export interface FiltersGlobalProps {
  children: React.ReactNode;
}

export const FiltersGlobal = React.memo<FiltersGlobalProps>(({ children }) => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();

  return (
    <InPortal node={globalKQLHeaderPortalNode}>
      <EuiPanel
        borderRadius="none"
        color="transparent"
        paddingSize="none"
        css={globalSearchBarStripVerticalPadding}
      >
        <header data-test-subj="filters-global-container">{children}</header>
      </EuiPanel>
    </InPortal>
  );
});

FiltersGlobal.displayName = 'FiltersGlobal';
