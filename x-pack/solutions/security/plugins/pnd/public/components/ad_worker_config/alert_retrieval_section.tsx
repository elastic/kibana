/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { ESQL_LANG_ID } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';
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
      {/* "ES|QL query" switch (enable/disable) with an info icon. */}
      <EuiSwitch
        data-test-subj="adWorkerEsqlSwitch"
        checked={value.esql_enabled}
        onChange={(e) => onChange({ esql_enabled: e.target.checked })}
        label={
          <SwitchLabel
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.esqlSwitchLabel', {
              defaultMessage: 'ES|QL query',
            })}
            tooltip={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.esqlSwitchInfo', {
              defaultMessage: 'Retrieve alerts using the ES|QL query below.',
            })}
          />
        }
      />

      {value.esql_enabled && (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.esqlLabel', {
              defaultMessage: 'ES|QL query',
            })}
            fullWidth
          >
            <div data-test-subj="adWorkerEsqlQuery">
              <CodeEditor
                languageId={ESQL_LANG_ID}
                value={value.esql_query}
                height={140}
                onChange={(next) => onChange({ esql_query: next })}
                options={{ lineNumbers: 'off', minimap: { enabled: false }, wordWrap: 'on' }}
                aria-label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.esqlAriaLabel', {
                  defaultMessage: 'ES|QL query editor',
                })}
              />
            </div>
          </EuiFormRow>
        </>
      )}

      <EuiSpacer size="l" />

      {/* "Alert retrieval workflows" switch with an info icon. */}
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
              defaultMessage: 'Run custom retrieval workflows alongside the ES|QL retrieval.',
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
