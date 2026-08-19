/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';
import { QueryModeSelector } from './vendored/query_mode_selector';
import { useAdWorkflows } from './use_ad_workflows';

interface Props {
  value: AttackDiscoveryWorkerConfig;
  onChange: (patch: Partial<AttackDiscoveryWorkerConfig>) => void;
}

const SwitchLabel: React.FC<{ label: string; tooltip: string }> = ({ label, tooltip }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip type="info" position="right" content={tooltip} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const AlertRetrievalSection: React.FC<Props> = ({ value, onChange }) => {
  const { data: workflows = [], isLoading } = useAdWorkflows();

  const workflowOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => workflows.map((w) => ({ label: w.name, value: w.id })),
    [workflows]
  );
  const selectedWorkflows = useMemo(
    () =>
      workflowOptions.filter((o) => value.alert_retrieval_workflow_ids.includes(o.value as string)),
    [workflowOptions, value.alert_retrieval_workflow_ids]
  );

  return (
    <>
      {/* "Alert retrieval method" — switch button that can be enabled/disabled, with an info icon. */}
      <EuiSwitch
        data-test-subj="adWorkerDefaultRetrievalSwitch"
        checked={value.default_retrieval_enabled}
        onChange={(e) => onChange({ default_retrieval_enabled: e.target.checked })}
        label={
          <SwitchLabel
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.methodLabel', {
              defaultMessage: 'Alert retrieval method',
            })}
            tooltip={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.methodInfo', {
              defaultMessage: 'Run the built-in alert retrieval. This POC uses ES|QL mode.',
            })}
          />
        }
      />

      {value.default_retrieval_enabled && (
        <>
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
              iconType="info"
            />
          )}
        </>
      )}

      <EuiSpacer size="l" />

      {/* "Alert retrieval workflows" — switch button, with an info icon. */}
      <EuiSwitch
        data-test-subj="adWorkerRetrievalWorkflowsSwitch"
        checked={value.alert_retrieval_workflows_enabled}
        onChange={(e) => onChange({ alert_retrieval_workflows_enabled: e.target.checked })}
        label={
          <SwitchLabel
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.workflowsLabel', {
              defaultMessage: 'Alert retrieval workflows',
            })}
            tooltip={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.workflowsInfo', {
              defaultMessage: 'Run custom retrieval workflows alongside the built-in retrieval.',
            })}
          />
        }
      />

      {value.alert_retrieval_workflows_enabled && (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.workflowsSelectLabel', {
              defaultMessage: 'Retrieval workflows',
            })}
            fullWidth
          >
            <EuiComboBox
              fullWidth
              isLoading={isLoading}
              data-test-subj="adWorkerRetrievalWorkflows"
              options={workflowOptions}
              selectedOptions={selectedWorkflows}
              onChange={(selected) =>
                onChange({ alert_retrieval_workflow_ids: selected.map((o) => o.value as string) })
              }
            />
          </EuiFormRow>
        </>
      )}
    </>
  );
};
