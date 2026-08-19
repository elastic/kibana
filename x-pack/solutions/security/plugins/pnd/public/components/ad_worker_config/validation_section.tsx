/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSpacer, EuiSuperSelect, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';

interface Props {
  value: AttackDiscoveryWorkerConfig;
  onChange: (patch: Partial<AttackDiscoveryWorkerConfig>) => void;
}

// POC: the built-in validation is the only option surfaced. Populating this from the managed
// workflows list (validation workflows) is a follow-up once persistence is wired.
const VALIDATION_OPTIONS = [
  {
    value: 'default',
    inputDisplay: i18n.translate('xpack.pnd.adWorkerConfig.validation.builtIn', {
      defaultMessage: 'Built-in validation',
    }),
  },
];

export const ValidationSection: React.FC<Props> = ({ value, onChange }) => (
  <>
    <EuiTitle size="xs">
      <h3>
        {i18n.translate('xpack.pnd.adWorkerConfig.validation.title', {
          defaultMessage: 'Validation',
        })}
      </h3>
    </EuiTitle>

    <EuiSpacer size="s" />

    <EuiFormRow
      label={i18n.translate('xpack.pnd.adWorkerConfig.validation.workflowLabel', {
        defaultMessage: 'Validation workflow',
      })}
      fullWidth
    >
      <EuiSuperSelect
        fullWidth
        data-test-subj="adWorkerValidationWorkflow"
        options={VALIDATION_OPTIONS}
        valueOfSelected={value.validation_workflow_id}
        onChange={(workflowId) => onChange({ validation_workflow_id: workflowId })}
      />
    </EuiFormRow>
  </>
);
