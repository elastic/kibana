/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { FormattedMessage } from '@kbn/i18n-react';
import { FullHeight, QueryViewTitlePanel } from './styles';
import { QueryTestResponse } from '../../types';

export interface ElasticsearchQueryOutputProps {
  queryResponse?: QueryTestResponse;
  queryError?: unknown;
  isError: boolean;
  isLoading: boolean;
  executeQuery: () => void;
}

export const ElasticsearchQueryOutput = ({
  queryResponse,
  executeQuery,
  isError,
  isLoading,
  queryError,
}: ElasticsearchQueryOutputProps) => {
  const { euiTheme } = useEuiTheme();
  const respJSON = useMemo(() => {
    if (isError) {
      if (queryError instanceof Error) {
        return queryError.toString();
      } else if (
        typeof queryError === 'object' &&
        queryError !== null &&
        'toString' in queryError
      ) {
        return (queryError as { toString: () => string }).toString();
      } else {
        return String(queryError);
      }
    }
    return queryResponse ? JSON.stringify(queryResponse.searchResponse, null, 2) : undefined;
  }, [isError, queryError, queryResponse]);
  return (
    <EuiSplitPanel.Outer hasBorder css={FullHeight} grow={false}>
      <EuiSplitPanel.Inner grow={false} css={QueryViewTitlePanel(euiTheme)}>
        <EuiText>
          <h5>
            <FormattedMessage
              id="xpack.searchPlayground.viewQuery.queryOutput.title"
              defaultMessage="Query output"
            />
          </h5>
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="none">
        {!!respJSON ? (
          <CodeEditor
            dataTestSubj="ViewElasticsearchQueryResponse"
            languageId="json"
            value={respJSON}
            options={{
              automaticLayout: true,
              readOnly: true,
            }}
            enableFindAction
            fullWidth
            isCopyable
          />
        ) : (
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            css={FullHeight}
            data-test-subj="ViewElasticsearchQueryResponseEmptyState"
          >
            <EuiEmptyPrompt
              color="plain"
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.queryOutput.emptyPrompt.title"
                    defaultMessage="Review the raw output of your query"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.queryOutput.emptyPrompt.body"
                    defaultMessage="Run your query above to view the raw JSON output here."
                  />
                </p>
              }
              actions={
                <EuiButton
                  data-test-subj="queryOutputEmptyPrompRunQuery"
                  iconSide="left"
                  iconType="play"
                  onClick={executeQuery}
                  isLoading={isLoading}
                >
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.queryOutput.emptyPrompt.action"
                    defaultMessage="Run your query"
                  />
                </EuiButton>
              }
            />
          </EuiFlexGroup>
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
