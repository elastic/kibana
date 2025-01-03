/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import React from 'react';

import {
  isCustomFieldMetadata,
  isEcsCompliantFieldMetadata,
  isSameFamilyFieldMetadata,
} from '../../../../../../../../utils/metadata';
import { EMPTY_PLACEHOLDER } from '../../../../../../../../constants';
import {
  DOCUMENT_VALUES_ACTUAL,
  ECS_MAPPING_TYPE_EXPECTED,
  ECS_VALUES_EXPECTED,
  FIELD,
  INDEX_MAPPING_TYPE_ACTUAL,
} from '../../../../../../../../translations';
import { EcsAllowedValues } from '../../../../ecs_allowed_values';
import { IndexInvalidValues } from '../../../../index_invalid_values';
import { CodeDanger, CodeSuccess } from '../../../../../../../../styles';
import type {
  AllowedValue,
  EnrichedFieldMetadata,
  UnallowedValueCount,
} from '../../../../../../../../types';
import { SameFamily } from '../../../../same_family';
import { ECS_DESCRIPTION } from '../../../../translations';

export const getAllTableColumns = (): Array<EuiTableFieldDataColumnType<EnrichedFieldMetadata>> => [
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
    render: (type: string | undefined) => (
      <CodeSuccess data-test-subj="codeSuccess">
        {type != null ? type : EMPTY_PLACEHOLDER}
      </CodeSuccess>
    ),
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'indexFieldType',
    name: INDEX_MAPPING_TYPE_ACTUAL,
    render: (_, x) => {
      // if custom field or ecs based field with mapping match
      if (isCustomFieldMetadata(x) || isEcsCompliantFieldMetadata(x)) {
        return <CodeSuccess data-test-subj="codeSuccess">{x.indexFieldType}</CodeSuccess>;
      }

      // mapping mismatch due to same family
      if (isSameFamilyFieldMetadata(x)) {
        return (
          <div>
            <CodeSuccess data-test-subj="codeSuccess">{x.indexFieldType}</CodeSuccess>
            <SameFamily />
          </div>
        );
      }

      // mapping mismatch
      return <CodeDanger data-test-subj="codeDanger">{x.indexFieldType}</CodeDanger>;
    },
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'allowed_values',
    name: ECS_VALUES_EXPECTED,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'indexInvalidValues',
    name: DOCUMENT_VALUES_ACTUAL,
    render: (indexInvalidValues: UnallowedValueCount[]) => (
      <IndexInvalidValues indexInvalidValues={indexInvalidValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'description',
    name: ECS_DESCRIPTION,
    render: (description: string | undefined) =>
      description != null ? (
        <span data-test-subj="description">{description}</span>
      ) : (
        <EuiCode data-test-subj="emptyDescription">{EMPTY_PLACEHOLDER}</EuiCode>
      ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
];
