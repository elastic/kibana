/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { isEmpty } from 'lodash';

export const getTimelineRowTypeIndicator: NonNullable<UnifiedDataTableProps['getRowIndicator']> = (
  row: DataTableRecord,
  euiTheme: EuiThemeComputed
) => {
  const isAlert = getFieldValue(row, 'event.kind') === 'signal';

  const isEql =
    !isEmpty(getFieldValue(row, 'eql.parentId')) &&
    !isEmpty(getFieldValue(row, 'eql.sequenceNumber'));

  if (isEql) {
    const sequenceNumber = ((getFieldValue(row, 'eql.sequenceNumber') as string) ?? '').split(
      '-'
    )[0];

    const isEvenSequence = parseInt(sequenceNumber, 10) % 2 === 0;

    return {
      /* alternating colors to differentiate consecutive sequences */
      color: isEvenSequence ? euiTheme.colors.primary : euiTheme.colors.accent,
      label: 'EQL Sequence',
    };
  }

  if (isAlert) {
    return {
      color: euiTheme.colors.warning,
      label: 'Alert',
    };
  }

  return {
    color: euiTheme.colors.lightShade,
    label: 'Event',
  };
};
