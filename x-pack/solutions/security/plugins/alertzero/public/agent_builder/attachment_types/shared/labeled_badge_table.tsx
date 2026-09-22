/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export interface LabeledBadgeTableRow {
  id: string;
  label: string;
  values: React.ReactNode;
}

export interface LabeledBadgeTableProps {
  rows: LabeledBadgeTableRow[];
  caption?: string;
  labelWidth?: string;
  testSubj?: string;
}

const wrappingCellCss = css`
  overflow-wrap: anywhere;
`;

const DEFAULT_CAPTION = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.labeledBadgeTableCaption',
  { defaultMessage: 'Labeled indicator table' }
);

/**
 * Two-column type/values table shape shared by the IOC, TTP, and anchor
 * sections across all three Hunt Watch attachment renderers. Mirrors
 * Security Solution's `investigation_iocs_inline_content.tsx` table shape
 * (plugin-internal, cannot be imported, so copied here).
 */
export const LabeledBadgeTable: React.FC<LabeledBadgeTableProps> = ({
  rows,
  caption = DEFAULT_CAPTION,
  labelWidth = '10em',
  testSubj,
}) => {
  const columns: Array<EuiBasicTableColumn<LabeledBadgeTableRow>> = [
    {
      field: 'label',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.shared.labelColumn', {
        defaultMessage: 'Type',
      }),
      width: labelWidth,
      render: (label: string) => (
        <EuiText size="s" color="subdued" css={wrappingCellCss}>
          {label}
        </EuiText>
      ),
    },
    {
      field: 'values',
      name: i18n.translate('xpack.alertzero.agentBuilder.attachments.shared.valuesColumn', {
        defaultMessage: 'Values',
      }),
      render: (values: React.ReactNode) => (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          wrap
          css={wrappingCellCss}
        >
          {React.Children.map(values, (child, index) => (
            <EuiFlexItem grow={false} key={index} css={{ minWidth: 0, maxWidth: '100%' }}>
              {child}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <EuiBasicTable
      tableCaption={caption}
      items={rows}
      columns={columns}
      itemId="id"
      tableLayout="auto"
      responsiveBreakpoint={false}
      compressed
      data-test-subj={testSubj}
    />
  );
};
