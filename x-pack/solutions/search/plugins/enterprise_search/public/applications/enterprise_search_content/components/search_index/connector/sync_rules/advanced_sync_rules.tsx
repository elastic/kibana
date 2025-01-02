/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiFormRow } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { isAdvancedSyncRuleSnippetEmpty } from '../../../../utils/sync_rules_helpers';

import { ConnectorFilteringLogic } from './connector_filtering_logic';

export const AdvancedSyncRules: React.FC = () => {
  const {
    hasJsonValidationError: hasError,
    localAdvancedSnippet,
    advancedSnippet,
  } = useValues(ConnectorFilteringLogic);
  const { setLocalAdvancedSnippet } = useActions(ConnectorFilteringLogic);
  const isAdvancedSnippetEmpty = isAdvancedSyncRuleSnippetEmpty(advancedSnippet);
  const isLocalSnippetEmpty = isAdvancedSyncRuleSnippetEmpty(localAdvancedSnippet);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.content.indices.connector.syncRules.advancedRules.title',
          {
            defaultMessage: 'Advanced rules',
          }
        )}
        isInvalid={hasError}
        error={
          hasError
            ? i18n.translate(
                'xpack.enterpriseSearch.content.indices.connector.syncRules.advancedRules.error',
                {
                  defaultMessage: 'JSON format is invalid',
                }
              )
            : undefined
        }
        fullWidth
      >
        <CodeEditor
          isCopyable
          languageId="json"
          options={{
            detectIndentation: true,
            lineNumbers: 'on',
            tabSize: 2,
          }}
          value={localAdvancedSnippet}
          onChange={(value) => {
            setLocalAdvancedSnippet(value);
          }}
          height="250px"
          width="100%"
        />
      </EuiFormRow>

      {(!isAdvancedSnippetEmpty || !isLocalSnippetEmpty) && (
        <EuiCallOut
          title={i18n.translate(
            'xpack.enterpriseSearch.content.index.connector.syncRules.advancedTabCallout.title',
            { defaultMessage: 'Configuration warning' }
          )}
          color="warning"
        >
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.editSyncRulesFlyout.advancedTablCallout.description"
              defaultMessage="This advanced sync rule might override some configuration fields."
            />
          </p>
        </EuiCallOut>
      )}
    </>
  );
};
