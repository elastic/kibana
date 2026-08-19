/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
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

export const AlertRetrievalSection: React.FC<Props> = ({ value, onChange }) => {
  const { data: workflows = [], isLoading } = useAdWorkflows();

  const [filterText, setFilterText] = useState<string>(
    value.filter ? JSON.stringify(value.filter, null, 2) : ''
  );
  const [filterInvalid, setFilterInvalid] = useState(false);

  const retrievalWorkflowOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => workflows.map((w) => ({ label: w.name, value: w.id })),
    [workflows]
  );

  const selectedRetrievalWorkflows = useMemo(
    () =>
      retrievalWorkflowOptions.filter((o) =>
        value.alert_retrieval_workflow_ids.includes(o.value as string)
      ),
    [retrievalWorkflowOptions, value.alert_retrieval_workflow_ids]
  );

  const onFilterChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      setFilterText(next);
      if (next.trim() === '') {
        setFilterInvalid(false);
        onChange({ filter: undefined });
        return;
      }
      try {
        const parsed = JSON.parse(next) as Record<string, unknown>;
        setFilterInvalid(false);
        onChange({ filter: parsed });
      } catch {
        setFilterInvalid(true);
      }
    },
    [onChange]
  );

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.workflowsLabel', {
          defaultMessage: 'Alert retrieval workflows',
        })}
        helpText={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.workflowsHelp', {
          defaultMessage: 'Custom retrieval workflows to run alongside the built-in retrieval.',
        })}
        fullWidth
      >
        <EuiComboBox
          fullWidth
          isLoading={isLoading}
          data-test-subj="adWorkerRetrievalWorkflows"
          options={retrievalWorkflowOptions}
          selectedOptions={selectedRetrievalWorkflows}
          onChange={(selected) =>
            onChange({
              alert_retrieval_workflow_ids: selected.map((o) => o.value as string),
            })
          }
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

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
            data-test-subj="adWorkerEsqlQuery"
            value={value.esql_query ?? ''}
            onChange={(event) => onChange({ esql_query: event.target.value })}
          />
        </EuiFormRow>
      ) : (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.sizeLabel', {
              defaultMessage: 'Max alerts',
            })}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              data-test-subj="adWorkerSize"
              min={1}
              value={value.size}
              onChange={(event) => onChange({ size: Number(event.target.value) })}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.startLabel', {
              defaultMessage: 'Time range start (date math)',
            })}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              data-test-subj="adWorkerStart"
              value={value.start}
              onChange={(event) => onChange({ start: event.target.value })}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.endLabel', {
              defaultMessage: 'Time range end (date math)',
            })}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              data-test-subj="adWorkerEnd"
              value={value.end}
              onChange={(event) => onChange({ end: event.target.value })}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.filterLabel', {
              defaultMessage: 'Filter (Elasticsearch DSL, optional)',
            })}
            isInvalid={filterInvalid}
            error={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.filterError', {
              defaultMessage: 'Filter must be valid JSON.',
            })}
            fullWidth
          >
            <EuiTextArea
              fullWidth
              data-test-subj="adWorkerFilter"
              isInvalid={filterInvalid}
              value={filterText}
              onChange={onFilterChange}
            />
          </EuiFormRow>
        </>
      )}
    </>
  );
};
