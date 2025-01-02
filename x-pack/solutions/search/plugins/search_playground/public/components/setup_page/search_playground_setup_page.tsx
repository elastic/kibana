/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQueryIndices } from '../../hooks/use_query_indices';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';
import { AddDataSources } from './add_data_sources';

export const SearchPlaygroundSetupPage: React.FC = () => {
  const usageTracker = useUsageTracker();
  const { isLoading: isIndicesLoading } = useQueryIndices();

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.setupSearchPageLoaded);
  }, [usageTracker]);

  return (
    <EuiEmptyPrompt
      iconType="indexOpen"
      data-test-subj="setupPage"
      title={
        <h2>
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.queryBuilder.title"
            defaultMessage="Add data to query"
          />
        </h2>
      }
      actions={
        <EuiFlexGroup justifyContent="center">
          {isIndicesLoading ? (
            <EuiLoadingSpinner />
          ) : (
            <EuiFlexItem grow={false}>
              <AddDataSources />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              <FormattedMessage
                id="xpack.searchPlayground.setupPage.learnMore"
                defaultMessage="Want to learn more?"
              />
            </span>
          </EuiTitle>{' '}
          <EuiLink href="todo" target="_blank" external>
            <FormattedMessage
              id="xpack.searchPlayground.setupPage.documentationLink"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </>
      }
    />
  );
};
