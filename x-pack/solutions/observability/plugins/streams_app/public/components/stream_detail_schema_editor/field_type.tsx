/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { FieldDefinitionConfig } from '@kbn/streams-schema';
import { FieldIcon } from '@kbn/react-field';
import { FIELD_TYPE_MAP } from './configuration_maps';

export const FieldType = ({ type }: { type: FieldDefinitionConfig['type'] }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <FieldIcon type={type} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{`${FIELD_TYPE_MAP[type].label}`}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
