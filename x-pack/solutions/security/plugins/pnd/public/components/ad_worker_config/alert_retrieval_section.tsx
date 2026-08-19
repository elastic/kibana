/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSuperSelect,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';

interface Props {
  value: AttackDiscoveryWorkerConfig;
  onChange: (patch: Partial<AttackDiscoveryWorkerConfig>) => void;
}

const RETRIEVAL_MODE_OPTIONS = [
  {
    value: 'custom_query' as const,
    inputDisplay: i18n.translate('xpack.pnd.adWorkerConfig.retrieval.modeCustomQuery', {
      defaultMessage: 'DSL query (custom_query)',
    }),
  },
  {
    value: 'esql' as const,
    inputDisplay: i18n.translate('xpack.pnd.adWorkerConfig.retrieval.modeEsql', {
      defaultMessage: 'ES|QL (esql)',
    }),
  },
];

export const AlertRetrievalSection: React.FC<Props> = ({ value, onChange }) => {
  // Local text mirror of `filter` so invalid JSON can be shown inline without corrupting config.
  const [filterText, setFilterText] = useState<string>(
    value.filter ? JSON.stringify(value.filter, null, 2) : ''
  );
  const [filterInvalid, setFilterInvalid] = useState(false);

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
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.pnd.adWorkerConfig.retrieval.title', {
            defaultMessage: 'Alert retrieval method',
          })}
        </h3>
      </EuiTitle>

      <EuiFormRow
        label={i18n.translate('xpack.pnd.adWorkerConfig.retrieval.modeLabel', {
          defaultMessage: 'Retrieval method',
        })}
        fullWidth
      >
        <EuiSuperSelect
          fullWidth
          data-test-subj="adWorkerRetrievalMode"
          options={RETRIEVAL_MODE_OPTIONS}
          valueOfSelected={value.alert_retrieval_mode}
          onChange={(mode) => onChange({ alert_retrieval_mode: mode })}
        />
      </EuiFormRow>

      {value.alert_retrieval_mode === 'esql' && (
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
      )}

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
  );
};
