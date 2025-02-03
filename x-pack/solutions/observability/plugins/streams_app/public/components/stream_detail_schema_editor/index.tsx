/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiPortal } from '@elastic/eui';
import { css } from '@emotion/css';
import { WiredStreamGetResponse } from '@kbn/streams-schema';
import { useEditingState } from './hooks/use_editing_state';
import { SchemaEditorFlyout } from './flyout';
import { useKibana } from '../../hooks/use_kibana';
import { useUnpromotingState } from './hooks/use_unpromoting_state';
import { SimpleSearchBar } from './simple_search_bar';
import { UnpromoteFieldModal } from './unpromote_field_modal';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { FieldsTableContainer } from './fields_table';
import { FieldTypeFilterGroup } from './filters/type_filter_group';
import { useQueryAndFilters } from './hooks/use_query_and_filters';
import { FieldStatusFilterGroup } from './filters/status_filter_group';
import { SchemaEditor } from './schema_editor';
import { SchemaField, SchemaFieldStatus } from './types';

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
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  // const queryAndFiltersState = useQueryAndFilters();

  const {
    value: unmappedFieldsValue,
    loading: isLoadingUnmappedFields,
    refresh: refreshUnmappedFields,
  } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams/{id}/schema/unmapped_fields', {
        signal,
        params: {
          path: {
            id: definition.stream.name,
          },
        },
      });
    },
    [definition.stream.name, streamsRepositoryClient]
  );

  const editingState = useEditingState({
    definition,
    streamsRepositoryClient,
    refreshDefinition,
    refreshUnmappedFields,
    toastsService: toasts,
  });

  const unpromotingState = useUnpromotingState({
    definition,
    streamsRepositoryClient,
    refreshDefinition,
    refreshUnmappedFields,
    toastsService: toasts,
  });

  const { reset } = editingState;

  // If the definition changes (e.g. navigating to parent stream), reset the entire editing state.
  useEffect(() => {
    reset();
  }, [definition.stream.name, reset]);

  const fields = useMemo(() => {
    const inheritedFields: SchemaField[] = Object.entries(definition.inherited_fields).map(
      ([name, field]) => ({
        name,
        type: field.type,
        format: field.format,
        parent: field.from,
        status: 'inherited',
      })
    );

    const mappedFields: SchemaField[] = Object.entries(definition.stream.ingest.wired.fields).map(
      ([name, field]) => ({
        name,
        type: field.type,
        format: field.format,
        parent: definition.stream.name,
        status: 'mapped',
      })
    );

    const unmappedFields: SchemaField[] =
      unmappedFieldsValue?.unmappedFields.map((field) => ({
        name: field,
        parent: definition.stream.name,
        status: 'unmapped',
      })) ?? [];

    return [...inheritedFields, ...mappedFields, ...unmappedFields];
  }, [definition, unmappedFieldsValue]);

  return (
    <SchemaEditor
      fields={fields}
      isLoading={isLoadingDefinition || isLoadingUnmappedFields}
      stream={definition.stream}
      withControls
      withTableActions
    />
  );

  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column" gutterSize="m">
        {/* <EuiFlexItem
          className={css`
            overflow: auto;
          `}
        >
          <FieldsTableContainer
            definition={definition}
            unmappedFieldsResult={unmappedFieldsValue?.unmappedFields}
            isLoadingUnmappedFields={isLoadingUnmappedFields}
            editingState={editingState}
            unpromotingState={unpromotingState}
            queryAndFiltersState={queryAndFiltersState}
          />
        </EuiFlexItem> */}

        {editingState.selectedField && (
          <SchemaEditorFlyout
            definition={definition}
            streamsRepositoryClient={streamsRepositoryClient}
            {...editingState}
          />
        )}

        {unpromotingState.selectedField && (
          <UnpromoteFieldModal unpromotingState={unpromotingState} />
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
