/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiTitle, EuiFlexItem, EuiFlexGroup, EuiFlyoutHeader } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { SCRIPT_LIBRARY_LABELS as flyoutHeaderLabels } from '../../../translations';
import type { ScriptsLibraryUrlParams } from '../scripts_library_url_params';

export const EndpointScriptEditFlyoutHeader = memo(
  ({
    show,
    'data-test-subj': dataTestSubj,
  }: {
    show: Extract<ScriptsLibraryUrlParams['show'], 'edit' | 'create'>;
    'data-test-subj'?: string;
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    return (
      <EuiFlyoutHeader hasBorder data-test-subj={getTestId()}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2
                css={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                data-test-subj={getTestId('title')}
              >
                {show === 'edit'
                  ? flyoutHeaderLabels.flyout.editHeader
                  : flyoutHeaderLabels.flyout.createHeader}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
    );
  }
);

EndpointScriptEditFlyoutHeader.displayName = 'EndpointScriptEditFlyoutHeader';
