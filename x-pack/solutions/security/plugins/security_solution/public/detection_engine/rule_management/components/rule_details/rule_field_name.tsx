/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { ModifiedFieldBadge } from './modified_field_badge';
import { getHumanizedFieldName } from './get_humanized_field_name';

interface RuleFieldNameProps {
  fieldName: string;
  label?: string;
  showModifiedFields?: boolean;
}

export const RuleFieldName = ({
  fieldName,
  label,
  showModifiedFields = false,
}: RuleFieldNameProps) => {
  const humanizedFieldName = getHumanizedFieldName(fieldName);
  return showModifiedFields ? (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      {label ?? humanizedFieldName}
      <ModifiedFieldBadge fieldName={fieldName} />
    </EuiFlexGroup>
  ) : (
    label ?? humanizedFieldName
  );
};
