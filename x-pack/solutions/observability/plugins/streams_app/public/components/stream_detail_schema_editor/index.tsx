/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiPortal, EuiButton } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
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

  const queryAndFiltersState = useQueryAndFilters();

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

  const refreshData = useCallback(() => {
    refreshDefinition();
    refreshUnmappedFields();
  }, [refreshDefinition, refreshUnmappedFields]);

  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column">
        {isLoadingDefinition || isLoadingUnmappedFields ? (
          <EuiPortal>
            <EuiProgress size="xs" color="accent" position="fixed" />
          </EuiPortal>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <SimpleSearchBar
                query={queryAndFiltersState.query}
                onChange={(nextQuery) =>
                  queryAndFiltersState.setQuery(nextQuery.query ?? undefined)
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FieldTypeFilterGroup onChangeFilterGroup={queryAndFiltersState.changeFilterGroups} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FieldStatusFilterGroup
                onChangeFilterGroup={queryAndFiltersState.changeFilterGroups}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="streamsAppContentRefreshButton"
                iconType="refresh"
                onClick={refreshData}
              >
                {i18n.translate('xpack.streams.schemaEditor.refreshDataButtonLabel', {
                  defaultMessage: 'Refresh',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem
          className={css`
            overflow: auto;
          `}
          grow
        >
          <FieldsTableContainer
            definition={definition}
            query={queryAndFiltersState.query}
            unmappedFieldsResult={unmappedFieldsValue?.unmappedFields}
            isLoadingUnmappedFields={isLoadingUnmappedFields}
            editingState={editingState}
            unpromotingState={unpromotingState}
            queryAndFiltersState={queryAndFiltersState}
          />
        </EuiFlexItem>

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
