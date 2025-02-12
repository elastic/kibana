/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as i18n from './translations';

interface QueryViewerProps {
  ruleName: string;
  language: string;
  query: string;
  queryPlaceholder?: string;
  onEdit?: () => void;
}

export const QueryViewer: React.FC<QueryViewerProps> = React.memo(
  ({ ruleName, language, query, queryPlaceholder, onEdit }) => {
    const codeBlockLanguage = useMemo(() => {
      if (language === 'spl') {
        return 'splunk-spl';
      }
      return 'sql';
    }, [language]);

    return (
      <>
        {onEdit ? (
          <EuiFlexGroup direction="row" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="pencil" onClick={onEdit} size="xs">
                {i18n.EDIT}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiSpacer size="l" />
        )}
        <EuiTitle size="xxs">
          <h3>{ruleName}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        {query.length ? (
          <EuiCodeBlock
            language={codeBlockLanguage}
            fontSize="s"
            paddingSize="s"
            className="eui-textBreakWord"
          >
            {query}
          </EuiCodeBlock>
        ) : (
          <EuiText size="xs" color="subdued">
            {queryPlaceholder}
          </EuiText>
        )}
      </>
    );
  }
);
QueryViewer.displayName = 'QueryViewer';
