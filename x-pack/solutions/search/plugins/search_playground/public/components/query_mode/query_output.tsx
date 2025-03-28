/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiSplitPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { FormattedMessage } from '@kbn/i18n-react';

import { getErrorMessage } from '../../../common/errors';
import { FullHeight, QueryViewTitlePanel } from './styles';
import { QueryTestResponse } from '../../types';

export interface ElasticsearchQueryOutputProps {
  queryResponse?: QueryTestResponse;
  queryError?: unknown;
  isError: boolean;
  isLoading: boolean;
}

export const ElasticsearchQueryOutput = ({
  queryResponse,
  isError,
  queryError,
}: ElasticsearchQueryOutputProps) => {
  const { euiTheme } = useEuiTheme();
  const respJSON = useMemo(() => {
    if (isError) {
      return getErrorMessage(queryError);
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
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.searchPlayground.viewQuery.queryOutput.emptyPrompt.body"
                  defaultMessage="Run your query above to view the raw JSON output here."
                />
              </p>
            </EuiText>
          </EuiFlexGroup>
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
