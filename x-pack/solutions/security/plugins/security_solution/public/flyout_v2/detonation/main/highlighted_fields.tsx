/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { HIGHLIGHTED_FIELDS } from '../report_data';
import * as i18n from '../translations';

export const DETONATION_HIGHLIGHTED_FIELDS_TEST_ID = 'detonationHighlightedFields';

interface HighlightedFieldRow {
  field: string;
  values: string[];
}

/**
 * Highlighted fields of the detonation, laid out like the highlighted fields in the alert flyout:
 * a title with an Edit button, and a bordered panel with a compact Field / Value table.
 */
export const HighlightedFields = memo(() => {
  const columns = useMemo<Array<EuiBasicTableColumn<HighlightedFieldRow>>>(
    () => [
      {
        field: 'field',
        name: i18n.FIELD,
        'data-test-subj': 'fieldCell',
        width: '30%',
      },
      {
        field: 'values',
        name: i18n.VALUE,
        'data-test-subj': 'valueCell',
        width: '70%',
        render: (values: string[]) => (
          <span css={{ wordBreak: 'break-all' }}>{values.join(', ')}</span>
        ),
      },
    ],
    []
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      data-test-subj={DETONATION_HIGHLIGHTED_FIELDS_TEST_ID}
    >
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" css={{ minHeight: '40px' }}>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h5>{i18n.HIGHLIGHTED_FIELDS}</h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" iconType="pencil" data-test-subj="detonationEditHighlighted">
              {i18n.EDIT}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasBorder hasShadow={false}>
          <EuiInMemoryTable
            items={HIGHLIGHTED_FIELDS}
            columns={columns}
            compressed
            tableCaption={i18n.HIGHLIGHTED_FIELDS}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

HighlightedFields.displayName = 'HighlightedFields';
