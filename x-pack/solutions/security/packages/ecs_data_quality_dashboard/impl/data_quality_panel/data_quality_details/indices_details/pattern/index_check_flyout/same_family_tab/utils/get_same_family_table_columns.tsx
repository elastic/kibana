/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiTableFieldDataColumnType } from '@elastic/eui';

import { SameFamilyFieldMetadata } from '../../../../../../types';
import {
  ECS_MAPPING_TYPE_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
} from '../../../../../../translations';
import { codeSuccessCss } from '../../../../../../styles';
import { SameFamily } from '../../same_family';
import { ECS_DESCRIPTION } from '../../translations';

export const getSameFamilyTableColumns = (): Array<
  EuiTableFieldDataColumnType<SameFamilyFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: FIELD,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'type',
    name: ECS_MAPPING_TYPE_EXPECTED,
    render: (type: string) => (
      <EuiCode css={codeSuccessCss} data-test-subj="codeSuccess">
        {type}
      </EuiCode>
    ),
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'indexFieldType',
    name: INDEX_MAPPING_TYPE_ACTUAL,
    render: (indexFieldType: string) => (
      <div>
        <EuiCode css={codeSuccessCss} data-test-subj="codeSuccess">
          {indexFieldType}
        </EuiCode>
        <SameFamily />
      </div>
    ),
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'description',
    name: ECS_DESCRIPTION,
    sortable: false,
    truncateText: false,
    width: '35%',
  },
];
