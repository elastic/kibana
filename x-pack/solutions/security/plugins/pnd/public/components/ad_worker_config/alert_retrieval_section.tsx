/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';
import { QueryModeSelector } from './vendored/query_mode_selector';

interface Props {
  value: AttackDiscoveryWorkerConfig;
  onChange: (patch: Partial<AttackDiscoveryWorkerConfig>) => void;
}

export const AlertRetrievalSection: React.FC<Props> = ({ value, onChange }) => (
  <>
    {/* Switch buttons with an information icon on the side (matches the AD flyout). */}
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.pnd.adWorkerConfig.retrieval.methodLabel', {
              defaultMessage: 'Alert retrieval method',
            })}
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="questionInCircle"
          position="right"
          content={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.methodInfo', {
            defaultMessage:
              'How alerts are retrieved before generation. This POC supports ES|QL mode with a pre-populated query.',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer size="s" />

    <QueryModeSelector
      mode={value.alert_retrieval_mode}
      onModeChange={(mode) => onChange({ alert_retrieval_mode: mode })}
    />

    {value.alert_retrieval_mode === 'esql' ? (
      <EuiFormRow
        label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.esqlLabel', {
          defaultMessage: 'ES|QL query',
        })}
        fullWidth
      >
        <EuiTextArea
          fullWidth
          rows={5}
          data-test-subj="adWorkerEsqlQuery"
          value={value.esql_query}
          onChange={(event) => onChange({ esql_query: event.target.value })}
        />
      </EuiFormRow>
    ) : (
      <EuiCallOut
        announceOnMount
        size="s"
        data-test-subj="adWorkerQueryBuilderPlaceholder"
        title={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.queryBuilderPlaceholder', {
          defaultMessage: 'Query builder mode is not included in this POC — use ES|QL mode.',
        })}
        iconType="iInCircle"
      />
    )}
  </>
);
