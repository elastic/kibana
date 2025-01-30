/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect } from 'react';
import { EMPTY_CONTENT } from '../fields_table';
import { EcsRecommendation } from './ecs_recommendation';
import { FieldFormType } from './field_form_type';
import { FieldEntry, SchemaEditorEditingState } from '../hooks/use_editing_state';
import { FieldType } from '../field_type';
import { useKibana } from '../../../hooks/use_kibana';
import { FIELD_TYPE_MAP } from '../configuration_maps';

export const FieldFormTypeWrapper = ({
  isEditing,
  nextFieldType,
  setNextFieldType,
  selectedFieldType,
  selectedFieldName,
}: {
  isEditing: boolean;
  nextFieldType: SchemaEditorEditingState['nextFieldType'];
  setNextFieldType: SchemaEditorEditingState['setNextFieldType'];
  selectedFieldType: FieldEntry['type'];
  selectedFieldName: FieldEntry['name'];
}) => {
  const {
    dependencies: {
      start: {
        fieldsMetadata: { useFieldsMetadata },
      },
    },
  } = useKibana();

  const { fieldsMetadata, loading } = useFieldsMetadata(
    {
      attributes: ['type'],
      fieldNames: [selectedFieldName],
    },
    [selectedFieldName]
  );

  // Propagate recommendation to state if a type is not already set
  useEffect(() => {
    const recommendation = fieldsMetadata?.[selectedFieldName]?.type;
    if (
      !loading &&
      recommendation !== undefined &&
      // Supported type
      recommendation in FIELD_TYPE_MAP &&
      !nextFieldType
    ) {
      setNextFieldType(recommendation as FieldEntry['type']);
    }
  }, [fieldsMetadata, loading, nextFieldType, selectedFieldName, setNextFieldType]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        {isEditing ? (
          <FieldFormType
            nextFieldType={nextFieldType}
            setNextFieldType={setNextFieldType}
            isLoadingRecommendation={loading}
            recommendation={fieldsMetadata?.[selectedFieldName]?.type}
          />
        ) : selectedFieldType ? (
          <FieldType type={selectedFieldType} />
        ) : (
          `${EMPTY_CONTENT}`
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EcsRecommendation
          isLoading={loading}
          recommendation={fieldsMetadata?.[selectedFieldName]?.type}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
