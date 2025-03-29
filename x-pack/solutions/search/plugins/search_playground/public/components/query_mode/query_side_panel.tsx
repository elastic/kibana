/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiForm, EuiPanel, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { useController, useWatch } from 'react-hook-form';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { ChatForm, ChatFormFields, PlaygroundPageMode } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';
import { createQuery } from '../../utils/create_query';
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
  const sourceFields = useWatch<ChatForm, ChatFormFields.sourceFields>({
    name: ChatFormFields.sourceFields,
  });
  const {
    field: { onChange: queryFieldsOnChange, value: queryFields },
  } = useController<ChatForm, ChatFormFields.queryFields>({
    name: ChatFormFields.queryFields,
  });
  const {
    field: { onChange: elasticsearchQueryChange },
  } = useController<ChatForm, ChatFormFields.elasticsearchQuery>({
    name: ChatFormFields.elasticsearchQuery,
  });
  const {
    field: { onChange: userElasticsearchQueryChange },
  } = useController<ChatForm, ChatFormFields.userElasticsearchQuery>({
    name: ChatFormFields.userElasticsearchQuery,
  });
  const {
    field: { value: userElasticsearchQueryValidations },
  } = useController<ChatForm, ChatFormFields.userElasticsearchQueryValidations>({
    name: ChatFormFields.userElasticsearchQueryValidations,
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

      queryFieldsOnChange(updatedQueryFields);
      const updatedQuery = createQuery(updatedQueryFields, sourceFields, fields);
      elasticsearchQueryChange(updatedQuery);
      // ensure the userQuery is cleared so it doesn't diverge from the generated query.
      userElasticsearchQueryChange(null);
      usageTracker?.count(AnalyticsEvents.queryFieldsUpdated, currentIndexFields.length);
    },
    [
      elasticsearchQueryChange,
      userElasticsearchQueryChange,
      fields,
      queryFields,
      queryFieldsOnChange,
      sourceFields,
      usageTracker,
    ]
  );

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
        <EuiText>
          <h5>
            <FormattedMessage
              id="xpack.searchPlayground.viewQuery.flyout.table.title"
              defaultMessage="Fields to search (per index)"
            />
          </h5>
        </EuiText>
        {Object.entries(fields).map(([index, group]) => (
          <EuiFlexItem grow={false} key={index}>
            <QueryFieldsPanel
              index={index}
              indexFields={group}
              updateFields={updateFields}
              queryFields={queryFields}
              customizedQuery={userElasticsearchQueryValidations?.isUserCustomized ?? false}
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
