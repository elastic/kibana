/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldDefinitionConfig } from '@kbn/streams-schema';
import { FieldNameWithIcon } from '@kbn/react-field';
import { FIELD_TYPE_MAP } from './constants';

export const FieldType = ({ type }: { type: FieldDefinitionConfig['type'] }) => {
  return <FieldNameWithIcon name={FIELD_TYPE_MAP[type].label} type={type} />;
};
