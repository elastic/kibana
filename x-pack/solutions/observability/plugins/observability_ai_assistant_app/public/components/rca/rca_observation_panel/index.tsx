/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/css';
import { RootCauseAnalysisCollapsiblePanel } from '../rca_collapsible_panel';

export function RootCauseAnalysisObservationPanel({
  content,
  title,
  loading,
}: {
  content?: string;
  title: React.ReactNode;
  loading?: boolean;
}) {
  const theme = useEuiTheme().euiTheme;
  return (
    <RootCauseAnalysisCollapsiblePanel
      isDisabled={loading}
      title={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="m">
          <EuiTitle
            size="xs"
            className={css`
              color: ${loading ? theme.colors.subduedText : theme.colors.text};
              white-space: nowrap;
            `}
          >
            <h2>
              {i18n.translate('xpack.observabilityAiAssistant.rca.observationPanelTitle', {
                defaultMessage: 'Observations',
              })}
            </h2>
          </EuiTitle>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="m">
              <EuiText size="s" color={loading ? theme.colors.subduedText : theme.colors.text}>
                {title}
              </EuiText>
              {loading ? <EuiLoadingSpinner size="s" /> : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      color="success"
      content={content ? <EuiMarkdownFormat textSize="s">{content}</EuiMarkdownFormat> : null}
    />
  );
}
