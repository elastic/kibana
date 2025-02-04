/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect } from 'react';
import { EcsRecommendation } from './ecs_recommendation';
import { FieldFormType, FieldFormTypeProps } from './field_form_type';
import { FieldType } from '../field_type';
import { useKibana } from '../../../hooks/use_kibana';
import { EMPTY_CONTENT, FIELD_TYPE_MAP } from '../constants';
import { MappedSchemaField, SchemaField } from '../types';

export const FieldFormTypeWrapper = ({
  field,
  isEditing,
  onTypeChange,
}: {
  field: SchemaField;
  isEditing: boolean;
  onTypeChange: FieldFormTypeProps['onChange'];
}) => {
  const { useFieldsMetadata } = useKibana().dependencies.start.fieldsMetadata;

  const { fieldsMetadata, loading } = useFieldsMetadata(
    { attributes: ['type'], fieldNames: [field.name] },
    [field]
  );

  // Propagate recommendation to state if a type is not already set
  const recommendation = fieldsMetadata?.[field.name]?.type;

  useEffect(() => {
    if (
      !loading &&
      recommendation !== undefined &&
      // Supported type
      recommendation in FIELD_TYPE_MAP &&
      !field.type
    ) {
      onTypeChange(recommendation as MappedSchemaField['type']);
    }
  }, [field, loading, recommendation, onTypeChange]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        {isEditing ? (
          <FieldFormType value={field.type} onChange={onTypeChange} isLoading={loading} />
        ) : field.type ? (
          <FieldType type={field.type} />
        ) : (
          EMPTY_CONTENT
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EcsRecommendation isLoading={loading} recommendation={recommendation} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
