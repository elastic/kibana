/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSearchBar,
  EuiPortal,
  Query,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { WiredReadStreamDefinition } from '@kbn/streams-schema';
import { useEditingState } from './hooks/use_editing_state';
import { SchemaEditorFlyout } from './flyout';
import { useKibana } from '../../hooks/use_kibana';
import { useUnpromotingState } from './hooks/use_unpromoting_state';
import { SimpleSearchBar } from './simple_search_bar';
import { UnpromoteFieldModal } from './unpromote_field_modal';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { FieldsTableContainer } from './fields_table';

interface SchemaEditorProps {
  definition?: WiredReadStreamDefinition;
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

  const [query, setQuery] = useState<Query | undefined>(EuiSearchBar.Query.MATCH_ALL);

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
            id: definition.name,
          },
        },
      });
    },
    [definition.name, streamsRepositoryClient]
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
  }, [definition.name, reset]);

  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column">
        {isLoadingDefinition || isLoadingUnmappedFields ? (
          <EuiPortal>
            <EuiProgress size="xs" color="accent" position="fixed" />
          </EuiPortal>
        ) : null}
        <EuiFlexItem grow={false}>
          <SimpleSearchBar
            query={query}
            onChange={(nextQuery) => setQuery(nextQuery.query ?? undefined)}
          />
        </EuiFlexItem>
        <EuiFlexItem
          className={css`
            overflow: auto;
          `}
          grow
        >
          <FieldsTableContainer
            definition={definition}
            query={query}
            unmappedFieldsResult={unmappedFieldsValue?.unmappedFields}
            isLoadingUnmappedFields={isLoadingUnmappedFields}
            editingState={editingState}
            unpromotingState={unpromotingState}
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
