/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiTableFieldDataColumnType } from '@elastic/eui';
import React from 'react';

import { FIELD } from '../../../../../../../../translations';
import { CustomFieldMetadata } from '../../../../../../../../types';
import { INDEX_MAPPING_TYPE } from '../translations';

export const getCustomTableColumns = (): Array<
  EuiTableFieldDataColumnType<CustomFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: FIELD,
    sortable: true,
    truncateText: false,
    width: '50%',
  },
  {
    field: 'indexFieldType',
    name: INDEX_MAPPING_TYPE,
    render: (indexFieldType: string) => (
      <EuiCode data-test-subj="indexFieldType">{indexFieldType}</EuiCode>
    ),
    sortable: true,
    truncateText: false,
    width: '50%',
  },
];
