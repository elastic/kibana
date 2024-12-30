/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToken } from '@elastic/eui';

import { SchemaType, InternalSchemaType } from '../../../shared/schema/types';

import { FieldType } from './types';

interface Props {
  fieldType: FieldType;
}

const fieldTypeToTokenMap = {
  [SchemaType.Text]: 'tokenString',
  [InternalSchemaType.String]: 'tokenString',
  [SchemaType.Number]: 'tokenNumber',
  [InternalSchemaType.Float]: 'tokenNumber',
  [SchemaType.Geolocation]: 'tokenGeo',
  [InternalSchemaType.Location]: 'tokenGeo',
  [SchemaType.Date]: 'tokenDate',
  // @ts-expect-error upgrade typescript v5.1.6
  [InternalSchemaType.Date]: 'tokenDate',
  [InternalSchemaType.Nested]: 'tokenNested',
};

export const ResultToken: React.FC<Props> = ({ fieldType }) => {
  return <EuiToken iconType={fieldTypeToTokenMap[fieldType]} />;
};
