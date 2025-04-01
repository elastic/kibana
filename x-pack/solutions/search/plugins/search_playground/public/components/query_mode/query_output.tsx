/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiSplitPanel, EuiText, EuiLoadingLogo, useEuiTheme } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isHttpFetchError } from '@kbn/core-http-browser';

import { getErrorMessage } from '../../../common/errors';
import { FullHeight, PanelFillContainer, QueryViewTitlePanel } from './styles';
import { QueryTestResponse } from '../../types';

const LOADING_MESSAGE = i18n.translate(
  'xpack.searchPlayground.viewQuery.queryOutput.loading.message',
  { defaultMessage: 'Fetching...' }
);

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
  isLoading,
}: ElasticsearchQueryOutputProps) => {
  const { euiTheme } = useEuiTheme();
  const respJSON = useMemo(() => {
    if (isError) {
      if (isHttpFetchError(queryError)) {
        return queryError?.body ? JSON.stringify(queryError?.body, null, 2) : queryError.message;
      }
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
      <EuiSplitPanel.Inner paddingSize="none" css={PanelFillContainer}>
        {!!respJSON ? (
          <CodeEditor
            dataTestSubj="ViewElasticsearchQueryResponse"
            languageId="json"
            value={isLoading ? LOADING_MESSAGE : respJSON}
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
            {isLoading ? (
              <EuiLoadingLogo />
            ) : (
              <EuiText>
                <p>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.queryOutput.emptyPrompt.body"
                    defaultMessage="Run your query above to view the raw JSON output here."
                  />
                </p>
              </EuiText>
            )}
          </EuiFlexGroup>
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
