/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { WiredStreamGetResponse, isRootStreamDefinition } from '@kbn/streams-schema';
import { SchemaEditor } from '../schema_editor';
import { useSchemaFields } from '../schema_editor/hooks/use_schema_fields';

interface SchemaEditorProps {
  definition?: WiredStreamGetResponse;
  refreshDefinition: () => void;
  isLoadingDefinition: boolean;
}

export function StreamDetailSchemaEditor(props: SchemaEditorProps) {
  if (!props.definition) return null;
  return <Content definition={props.definition} {...props} />;
}

const Content = ({
  definition,
  refreshDefinition,
  isLoadingDefinition,
}: Required<SchemaEditorProps>) => {
  const { fields, isLoadingUnmappedFields, refreshFields, unmapField, updateField } =
    useSchemaFields({
      definition,
      refreshDefinition,
    });

  return (
    <SchemaEditor
      fields={fields}
      isLoading={isLoadingDefinition || isLoadingUnmappedFields}
      stream={definition.stream}
      onFieldUnmap={unmapField}
      onFieldUpdate={updateField}
      onRefreshData={refreshFields}
      withControls
      withFieldSimulation
      withTableActions={!isRootStreamDefinition(definition.stream)}
    />
  );
};
