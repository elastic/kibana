/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCopy, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

export function SloGroupings({ groupings }: Pick<SLOWithSummaryResponse, 'groupings'>) {
  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" wrap={true}>
      {Object.entries(groupings ?? {}).map(([key, value]) => (
        <EuiFlexItem key={key} grow={false}>
          <EuiText size="xs" color="subdued">
            <strong>{key}:</strong>{' '}
            <EuiCopy textToCopy={String(value)}>
              {(copy) => (
                <EuiText size="xs" onClick={copy} style={{ cursor: 'pointer' }}>
                  {value}
                </EuiText>
              )}
            </EuiCopy>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
