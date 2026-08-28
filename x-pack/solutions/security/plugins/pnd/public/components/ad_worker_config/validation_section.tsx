/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';
import { useAdWorkflows } from './use_ad_workflows';

interface Props {
  value: AttackDiscoveryWorkerConfig;
  onChange: (patch: Partial<AttackDiscoveryWorkerConfig>) => void;
}

const isValidationWorkflow = (w: { id: string; name: string; tags?: string[] }): boolean =>
  /validat/i.test(w.id) ||
  /validat/i.test(w.name) ||
  (w.tags ?? []).some((t) => /validat/i.test(t));

export const ValidationSection: React.FC<Props> = ({ value, onChange }) => {
  const { data: workflows = [], isLoading } = useAdWorkflows();

  const options = useMemo(() => {
    const validation = workflows.filter(isValidationWorkflow);
    return [
      {
        value: 'default',
        inputDisplay: i18n.translate('xpack.pnd.adWorkerConfig.validation.builtIn', {
          defaultMessage: 'Built-in validation (default)',
        }),
      },
      ...validation.map((w) => ({ value: w.id, inputDisplay: w.name })),
    ];
  }, [workflows]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.pnd.adWorkerConfig.validation.workflowLabel', {
        defaultMessage: 'Validation workflow',
      })}
      fullWidth
    >
      <EuiSuperSelect
        fullWidth
        isLoading={isLoading}
        data-test-subj="adWorkerValidationWorkflow"
        options={options}
        valueOfSelected={value.validation_workflow_id}
        onChange={(workflowId) => onChange({ validation_workflow_id: workflowId })}
      />
    </EuiFormRow>
  );
};
