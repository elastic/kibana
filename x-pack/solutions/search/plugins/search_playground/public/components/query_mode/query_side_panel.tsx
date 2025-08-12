/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { generateSearchQuery } from '@kbn/search-queries';
import { useController, useWatch, useFormContext } from 'react-hook-form';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { PlaygroundForm, PlaygroundFormFields, PlaygroundPageMode } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';
import { SearchQuery } from './search_query';
import { QueryFieldsPanel } from './query_fields_panel';
import { ChatPrompt } from './chat_prompt';
import { EditContextPanel } from '../edit_context/edit_context_panel';

export interface QuerySidePanelProps {
  executeQuery: () => void;
  executeQueryDisabled: boolean;
  isLoading: boolean;
  pageMode: PlaygroundPageMode;
}

export const QuerySidePanel = ({
  pageMode,
  executeQuery,
  executeQueryDisabled,
  isLoading,
}: QuerySidePanelProps) => {
  const usageTracker = useUsageTracker();
  const { fields } = useSourceIndicesFields();
  const { setValue, formState } = useFormContext<PlaygroundForm>();
  const sourceFields = useWatch<PlaygroundForm, PlaygroundFormFields.sourceFields>({
    name: PlaygroundFormFields.sourceFields,
  });
  const {
    field: { value: queryFields },
  } = useController<PlaygroundForm, PlaygroundFormFields.queryFields>({
    name: PlaygroundFormFields.queryFields,
  });
  const {
    field: { value: userElasticsearchQuery },
  } = useController<PlaygroundForm, PlaygroundFormFields.userElasticsearchQuery>({
    name: PlaygroundFormFields.userElasticsearchQuery,
  });

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (executeQueryDisabled) return;
      executeQuery();
    },
    [executeQuery, executeQueryDisabled]
  );
  const updateFields = useCallback(
    (index: string, fieldName: string, checked: boolean) => {
      const currentIndexFields = checked
        ? [...queryFields[index], fieldName]
        : queryFields[index].filter((field) => fieldName !== field);
      const updatedQueryFields = { ...queryFields, [index]: currentIndexFields };
      const updatedQuery = generateSearchQuery(updatedQueryFields, sourceFields, fields);

      setValue(PlaygroundFormFields.queryFields, updatedQueryFields, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(PlaygroundFormFields.elasticsearchQuery, updatedQuery, { shouldDirty: true });
      // ensure the userQuery is cleared so it doesn't diverge from the generated query.
      setValue(PlaygroundFormFields.userElasticsearchQuery, null);
      usageTracker?.count(AnalyticsEvents.queryFieldsUpdated, currentIndexFields.length);
    },
    [queryFields, sourceFields, fields, setValue, usageTracker]
  );
  const hasFieldsError = !!formState.errors[PlaygroundFormFields.queryFields];

  return (
    <EuiPanel color="subdued" hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiText>
          <h5>
            {pageMode === PlaygroundPageMode.Search ? (
              <FormattedMessage
                id="xpack.searchPlayground.viewQuery.sideBar.query.title"
                defaultMessage="Query"
              />
            ) : (
              <FormattedMessage
                id="xpack.searchPlayground.viewQuery.sideBar.prompt.title"
                defaultMessage="Question"
              />
            )}
          </h5>
        </EuiText>
        <EuiPanel grow={false} hasShadow={false} hasBorder>
          <EuiForm component="form" onSubmit={handleSearch}>
            {pageMode === PlaygroundPageMode.Search ? (
              <SearchQuery isLoading={isLoading} />
            ) : (
              <ChatPrompt isLoading={isLoading} />
            )}
          </EuiForm>
        </EuiPanel>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiText>
              <h5>
                <FormattedMessage
                  id="xpack.searchPlayground.viewQuery.flyout.table.title"
                  defaultMessage="Fields to search (per index)"
                />
              </h5>
            </EuiText>
            {hasFieldsError && (
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.queryFields.error"
                    defaultMessage="At least one index field must be enabled"
                  />
                }
              >
                <EuiIcon type="warning" color="danger" />
              </EuiToolTip>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        {Object.entries(fields).map(([index, group]) => (
          <EuiFlexItem grow={false} key={index}>
            <QueryFieldsPanel
              index={index}
              indexFields={group}
              updateFields={updateFields}
              queryFields={queryFields}
              customizedQuery={userElasticsearchQuery !== null}
            />
          </EuiFlexItem>
        ))}
        {pageMode === PlaygroundPageMode.Chat && (
          <>
            <EuiText>
              <h5>
                <FormattedMessage
                  id="xpack.searchPlayground.viewQuery.sideBar.context.title"
                  defaultMessage="Context"
                />
              </h5>
            </EuiText>
            <EditContextPanel />
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
