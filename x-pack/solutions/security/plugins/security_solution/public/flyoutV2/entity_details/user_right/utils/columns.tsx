/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { useEuiTheme, type EuiBasicTableColumn } from '@elastic/eui';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/default_renderer';
import type { ManagedUsersTableColumns, ManagedUserTable } from '../types';
import * as i18n from '../translations';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';

const FieldColumn: React.FC<{ label: string; field: string }> = ({ label, field }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        font-weight: ${euiTheme.font.weight.medium};
        color: ${euiTheme.colors.textHeading};
      `}
    >
      {label ?? field}
    </span>
  );
};

const fieldColumn: EuiBasicTableColumn<ManagedUserTable> = {
  name: i18n.FIELD_COLUMN_TITLE,
  field: 'label',
  render: (label: string, { field }) => <FieldColumn label={label} field={field ?? ''} />,
};

export const getManagedUserTableColumns = (contextID: string): ManagedUsersTableColumns => [
  fieldColumn,
  {
    name: i18n.VALUES_COLUMN_TITLE,
    field: 'value',
    render: (value: ManagedUserTable['value'], { field }) => {
      return field && value ? (
        <DefaultFieldRenderer
          rowItems={value.map(() => value.toString())}
          attrName={field}
          idPrefix={contextID ? `managedUser-${contextID}` : 'managedUser'}
        />
      ) : (
        defaultToEmptyTag(value)
      );
    },
  },
];
