/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiText, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { BadgeRow, TableFrame } from './primitives';

export interface LabeledBadgeTableRow {
  id: string;
  label: string;
  values: React.ReactNode;
}

export interface LabeledBadgeTableProps {
  rows: LabeledBadgeTableRow[];
  caption?: string;
  /** Width of the label column; defaults to the flyout table's 30%. */
  labelWidth?: string;
  testSubj?: string;
}

const DEFAULT_CAPTION = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.labeledBadgeTableCaption',
  { defaultMessage: 'Labeled indicator table' }
);

const FIELD_COLUMN = i18n.translate('xpack.alertzero.agentBuilder.attachments.shared.labelColumn', {
  defaultMessage: 'Field',
});

const VALUE_COLUMN = i18n.translate(
  'xpack.alertzero.agentBuilder.attachments.shared.valuesColumn',
  { defaultMessage: 'Value' }
);

/**
 * Field / Value table, styled like the Security flyout "Table" tab (compressed rows, bold
 * small headers, 30% field column) and framed in a bordered rounded panel so it reads as one
 * block inside the attachment card. Each row's values wrap as compact badges.
 */
export const LabeledBadgeTable: React.FC<LabeledBadgeTableProps> = ({
  rows,
  caption = DEFAULT_CAPTION,
  labelWidth = '30%',
  testSubj,
}) => {
  const columns: Array<EuiBasicTableColumn<LabeledBadgeTableRow>> = [
    {
      field: 'label',
      name: (
        <EuiText size="xs">
          <strong>{FIELD_COLUMN}</strong>
        </EuiText>
      ),
      width: labelWidth,
      render: (label: string) => (
        <EuiText size="xs" css={{ overflowWrap: 'anywhere' }}>
          {label}
        </EuiText>
      ),
    },
    {
      field: 'values',
      name: (
        <EuiText size="xs">
          <strong>{VALUE_COLUMN}</strong>
        </EuiText>
      ),
      render: (values: React.ReactNode) => <BadgeRow>{values}</BadgeRow>,
    },
  ];

  return (
    <TableFrame testSubj={testSubj}>
      <EuiBasicTable
        tableCaption={caption}
        items={rows}
        columns={columns}
        itemId="id"
        tableLayout="fixed"
        responsiveBreakpoint={false}
      />
    </TableFrame>
  );
};
