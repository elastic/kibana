/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { FieldIcon } from '@kbn/field-utils';
import type { FieldIconProps } from '@kbn/field-utils';

function mapEsTypesToIconProps(type: string) {
  switch (type) {
    case ES_FIELD_TYPES._ID:
    case ES_FIELD_TYPES._INDEX:
      /* In Discover "_id" and "_index" have the "keyword" icon. Doing same here for consistency */
      return { type: 'keyword' };
    case ES_FIELD_TYPES.OBJECT:
      return { type, iconType: 'tokenObject' };
    case ES_FIELD_TYPES.DATE_NANOS:
      return { type: 'date' };
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.SCALED_FLOAT:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.SHORT:
    case ES_FIELD_TYPES.UNSIGNED_LONG:
    case ES_FIELD_TYPES.AGGREGATE_METRIC_DOUBLE:
    case ES_FIELD_TYPES.FLOAT_RANGE:
    case ES_FIELD_TYPES.DOUBLE_RANGE:
    case ES_FIELD_TYPES.INTEGER_RANGE:
    case ES_FIELD_TYPES.LONG_RANGE:
    case ES_FIELD_TYPES.BYTE:
    case ES_FIELD_TYPES.TOKEN_COUNT:
      return { type: 'number' };
    default:
      return { type };
  }
}

interface RequiredFieldIconProps extends FieldIconProps {
  type: string;
  label?: string;
  'data-test-subj': string;
}

/**
 * `FieldIcon` component with addtional icons for types that are not handled by the `FieldIcon` component.
 */
export function RequiredFieldIcon({
  type,
  label = type,
  'data-test-subj': dataTestSubj,
  ...props
}: RequiredFieldIconProps) {
  return (
    <FieldIcon
      {...mapEsTypesToIconProps(type)}
      label={label}
      data-test-subj={dataTestSubj}
      {...props}
    />
  );
}
