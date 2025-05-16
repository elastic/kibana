/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ExpViewActionMenuContent } from './action_menu';
import { useExploratoryView } from '../../contexts/exploratory_view_config';

interface Props {
  timeRange?: { from: string; to: string };
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}
export function ExpViewActionMenu(props: Props) {
  const { setHeaderActionMenu, theme$ } = useExploratoryView();

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem>
          <ExpViewActionMenuContent {...props} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
}
