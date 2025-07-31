/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { EuiPanel } from '@elastic/eui';
import { useGlobalHeaderPortal } from '../../hooks/use_global_header_portal';

export interface FiltersGlobalProps {
  children: React.ReactNode;
}

export const FiltersGlobal = React.memo<FiltersGlobalProps>(({ children }) => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();

  return (
    <InPortal node={globalKQLHeaderPortalNode}>
      <EuiPanel borderRadius="none" color="subdued" paddingSize="none">
        <header data-test-subj="filters-global-container">{children}</header>
      </EuiPanel>
    </InPortal>
  );
});

FiltersGlobal.displayName = 'FiltersGlobal';
