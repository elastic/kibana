/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
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

import { Controller, useController, useFormContext } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../../types';
import { FullHeight, QueryViewTitlePanel } from './styles';
import { formatElasticsearchQueryString } from '../../utils/user_query';

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
  const { control } = useFormContext<ChatForm>();
  const {
    field: { value: elasticsearchQuery },
  } = useController<ChatForm, ChatFormFields.elasticsearchQuery>({
    name: ChatFormFields.elasticsearchQuery,
  });
  const {
    field: { value: userElasticsearchQuery },
  } = useController<ChatForm, ChatFormFields.userElasticsearchQuery>({
    name: ChatFormFields.userElasticsearchQuery,
  });
  const {
    field: { value: userElasticsearchQueryValidations },
  } = useController<ChatForm, ChatFormFields.userElasticsearchQueryValidations>({
    name: ChatFormFields.userElasticsearchQueryValidations,
  });
  const generatedEsQuery = useMemo(
    () => formatElasticsearchQueryString(elasticsearchQuery),
    [elasticsearchQuery]
  );
  const editorMounted = useCallback((editor: monacoEditor.editor.IStandaloneCodeEditor) => {
    monacoEditor.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [],
    });
  }, []);

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
              {userElasticsearchQueryValidations?.isUserCustomized ? (
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
      {userElasticsearchQueryValidations?.isUserCustomized &&
      (userElasticsearchQueryValidations?.userQueryErrors?.length ?? 0) > 0 ? (
        <EuiSplitPanel.Inner grow={false}>
          {userElasticsearchQueryValidations.userQueryErrors!.map((error, errorIndex) => (
            <EuiCallOut
              key={`user.query.error.${errorIndex}`}
              color="danger"
              iconType="error"
              title={error}
              size="s"
            />
          ))}
        </EuiSplitPanel.Inner>
      ) : null}
      <EuiSplitPanel.Inner paddingSize="none">
        <Controller
          control={control}
          name={ChatFormFields.userElasticsearchQuery}
          render={({ field }) => (
            <CodeEditor
              dataTestSubj="ViewElasticsearchQueryResult"
              languageId="json"
              {...field}
              value={userElasticsearchQuery ?? generatedEsQuery}
              options={{
                automaticLayout: true,
              }}
              editorDidMount={editorMounted}
              enableFindAction
              fullWidth
              isCopyable
            />
          )}
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
