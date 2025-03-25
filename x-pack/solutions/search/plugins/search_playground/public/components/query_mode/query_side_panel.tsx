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
import { ChatForm, ChatFormFields } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';
import { createQuery } from '../../utils/create_query';
import { SearchQuery } from './search_query';
import { QueryFieldsPanel } from './query_fields_panel';

export interface QuerySidePanelProps {
  executeQuery: () => void;
}

export const QuerySidePanel = ({ executeQuery }: QuerySidePanelProps) => {
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

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      executeQuery();
    },
    [executeQuery]
  );
  const updateFields = useCallback(
    (index: string, fieldName: string, checked: boolean) => {
      const currentIndexFields = checked
        ? [...queryFields[index], fieldName]
        : queryFields[index].filter((field) => fieldName !== field);
      const updatedQueryFields = { ...queryFields, [index]: currentIndexFields };

      queryFieldsOnChange(updatedQueryFields);
      elasticsearchQueryChange(createQuery(updatedQueryFields, sourceFields, fields));
      usageTracker?.count(AnalyticsEvents.queryFieldsUpdated, currentIndexFields.length);
    },
    [elasticsearchQueryChange, fields, queryFields, queryFieldsOnChange, sourceFields, usageTracker]
  );

  return (
    <EuiPanel color="subdued" hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiText>
          <h5>
            <FormattedMessage
              id="xpack.searchPlayground.viewQuery.sideBar.query.title"
              defaultMessage="Query"
            />
          </h5>
        </EuiText>
        <EuiPanel grow={false} hasShadow={false} hasBorder>
          <EuiForm component="form" onSubmit={handleSearch}>
            <SearchQuery />
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
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
