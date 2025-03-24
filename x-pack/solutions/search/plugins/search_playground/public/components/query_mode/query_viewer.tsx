/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/code-editor';

import { useController } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../../types';
import { FullHeight, QueryViewTitlePanel } from './styles';

export const ElasticsearchQueryViewer = ({
  executeQuery,
  isLoading,
}: {
  executeQuery: Function;
  isLoading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    field: { value: elasticsearchQuery },
  } = useController<ChatForm, ChatFormFields.elasticsearchQuery>({
    name: ChatFormFields.elasticsearchQuery,
  });
  const query = useMemo(() => JSON.stringify(elasticsearchQuery, null, 2), [elasticsearchQuery]);
  return (
    <EuiSplitPanel.Outer grow hasBorder css={FullHeight}>
      <EuiSplitPanel.Inner grow={false} css={QueryViewTitlePanel(euiTheme)}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.queryViewer.title"
                    defaultMessage="Query"
                  />
                </h5>
              </EuiText>
              <EuiBadge>
                <FormattedMessage
                  id="xpack.searchPlayground.viewQuery.elasticGenerated.badge"
                  defaultMessage="Elastic-generated"
                />
              </EuiBadge>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              size="s"
              color="primary"
              iconSide="left"
              iconType="play"
              data-test-subj="RunElasticsearchQueryButton"
              onClick={() => executeQuery()}
              isLoading={isLoading}
              aria-label={i18n.translate('xpack.searchPlayground.viewQuery.runQuery.ariaLabel', {
                defaultMessage: 'Run the elasticsearch query to view results.',
              })}
            >
              <FormattedMessage
                id="xpack.searchPlayground.viewQuery.runQuery.action"
                defaultMessage="Run"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner paddingSize="none">
        <CodeEditor
          dataTestSubj="ViewElasticsearchQueryResult"
          languageId="json"
          value={query}
          options={{
            automaticLayout: true,
            readOnly: true,
          }}
          enableFindAction
          fullWidth
          isCopyable
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
