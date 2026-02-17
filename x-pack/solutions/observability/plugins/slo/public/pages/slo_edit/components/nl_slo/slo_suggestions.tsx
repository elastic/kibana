/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SloSuggestion } from '../../../../hooks/use_suggest_slo';

interface SloSuggestionsProps {
  suggestions: SloSuggestion[];
  isLoading: boolean;
}

export function SloSuggestions({ suggestions, isLoading }: SloSuggestionsProps) {
  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" data-test-subj="sloSuggestionsLoading">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.slo.nlSlo.suggestions.loading', {
              defaultMessage: 'Analyzing SLO for improvement suggestions...',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <EuiAccordion
      id="sloAiSuggestions"
      buttonContent={
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('xpack.slo.nlSlo.suggestions.title', {
              defaultMessage: 'Enhancement suggestions ({count})',
              values: { count: suggestions.length },
            })}
          </h4>
        </EuiTitle>
      }
      initialIsOpen
      data-test-subj="sloAiSuggestions"
    >
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {suggestions.map((suggestion, index) => (
          <EuiFlexItem key={index}>
            <EuiCallOut title={suggestion.title} color="primary" iconType="iInCircle" size="s">
              <EuiText size="xs">
                <p>{suggestion.description}</p>
              </EuiText>
              {suggestion.field && (
                <EuiText size="xs" color="subdued">
                  <p>
                    {i18n.translate('xpack.slo.nlSlo.suggestions.affectedField', {
                      defaultMessage: 'Applies to: {field}',
                      values: { field: suggestion.field },
                    })}
                  </p>
                </EuiText>
              )}
            </EuiCallOut>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiAccordion>
  );
}
