/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/code-editor';
import { monaco as monacoEditor } from '@kbn/monaco';

import { useController, useFormContext } from 'react-hook-form';
import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { PlaygroundForm, PlaygroundFormFields } from '../../types';
import { FullHeight, QueryViewTitlePanel, PanelFillContainer } from './styles';
import { formatElasticsearchQueryString } from '../../utils/user_query';
import { FieldErrorCallout } from '../field_error_callout';

export const ElasticsearchQueryViewer = ({
  executeQuery,
  executeQueryDisabled,
  isLoading,
}: {
  executeQuery: Function;
  executeQueryDisabled: boolean;
  isLoading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const usageTracker = useUsageTracker();
  const [esQueryFirstEdit, setEsQueryFirtEdit] = useState<boolean>(false);
  const { trigger } = useFormContext<PlaygroundForm>();
  const {
    field: { value: elasticsearchQuery },
  } = useController<PlaygroundForm, PlaygroundFormFields.elasticsearchQuery>({
    name: PlaygroundFormFields.elasticsearchQuery,
  });
  const {
    field: { value: userElasticsearchQuery, onChange: onChangeUserQuery },
    fieldState: { error: userElasticsearchQueryError },
  } = useController<PlaygroundForm, PlaygroundFormFields.userElasticsearchQuery>({
    name: PlaygroundFormFields.userElasticsearchQuery,
  });
  const generatedEsQuery = useMemo(
    () => formatElasticsearchQueryString(elasticsearchQuery),
    [elasticsearchQuery]
  );
  const resetElasticsearchQuery = useCallback(() => {
    onChangeUserQuery(null);
  }, [onChangeUserQuery]);
  const editorMounted = useCallback((editor: monacoEditor.editor.IStandaloneCodeEditor) => {
    monacoEditor.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [],
    });
  }, []);
  const onEditorChange = useCallback(
    (value: string) => {
      if (esQueryFirstEdit === false && value !== generatedEsQuery) {
        setEsQueryFirtEdit(true);
        usageTracker?.count(AnalyticsEvents.editElasticsearchQuery);
      }
      onChangeUserQuery(value === generatedEsQuery ? null : value);
      trigger(PlaygroundFormFields.userElasticsearchQuery);
    },
    [esQueryFirstEdit, generatedEsQuery, usageTracker, onChangeUserQuery, trigger]
  );
  const userElasticsearchQueryIsCustomized = userElasticsearchQuery !== null;

  return (
    <EuiSplitPanel.Outer grow hasBorder css={FullHeight}>
      <EuiSplitPanel.Inner grow={false} css={QueryViewTitlePanel(euiTheme)}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow>
            <EuiFlexGroup gutterSize="s">
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.queryViewer.title"
                    defaultMessage="Query"
                  />
                </h5>
              </EuiText>
              {userElasticsearchQueryIsCustomized ? (
                <EuiBadge color="primary">
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.userCustomized.badge"
                    defaultMessage="User-customized"
                  />
                </EuiBadge>
              ) : (
                <EuiBadge>
                  <FormattedMessage
                    id="xpack.searchPlayground.viewQuery.elasticGenerated.badge"
                    defaultMessage="Elastic-generated"
                  />
                </EuiBadge>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {userElasticsearchQuery !== null ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconSide="left"
                iconType="refresh"
                data-test-subj="ResetElasticsearchQueryButton"
                onClick={resetElasticsearchQuery}
              >
                <FormattedMessage
                  id="xpack.searchPlayground.viewQuery.resetQuery.action"
                  defaultMessage="Reset to default"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
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
              disabled={executeQueryDisabled}
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
      {userElasticsearchQueryIsCustomized && userElasticsearchQueryError !== undefined ? (
        <EuiSplitPanel.Inner grow={false}>
          <FieldErrorCallout error={userElasticsearchQueryError} />
        </EuiSplitPanel.Inner>
      ) : null}
      <EuiSplitPanel.Inner paddingSize="none" css={PanelFillContainer}>
        <CodeEditor
          dataTestSubj="ViewElasticsearchQueryResult"
          languageId="json"
          onChange={onEditorChange}
          value={userElasticsearchQuery ?? generatedEsQuery}
          options={{
            automaticLayout: true,
          }}
          editorDidMount={editorMounted}
          enableFindAction
          fullWidth
          isCopyable
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
