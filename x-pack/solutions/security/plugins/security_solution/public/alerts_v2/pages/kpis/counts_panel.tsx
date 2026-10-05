/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInMemoryTable,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { EsqlInspectButton } from './esql_inspect_button';
import { useCountsData, type CountsDatum } from './use_counts_data';
import { useEpisodeFields } from './episode_fields';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.counts.title', {
  defaultMessage: 'Counts',
});

const NONE_OPTION = { value: '', text: 'None' };

const FIELD0_STORAGE_KEY = 'securitySolution.alertsV2.countsField0';
const FIELD1_STORAGE_KEY = 'securitySolution.alertsV2.countsField1';
const DEFAULT_FIELD0 = 'rule.id';
const DEFAULT_FIELD1 = '';

const PAGINATION = { initialPageSize: 10, pageSizeOptions: [10, 25, 50] };

/** Builds select options from the discovered fields, keeping the current selection present. */
const toSelectOptions = (fields: string[], selected: string) => {
  const list = selected && !fields.includes(selected) ? [selected, ...fields] : fields;
  return list.map((field) => ({ value: field, text: field }));
};

export interface CountsPanelProps {
  /** The page's ES|QL query — the table aggregates on top of it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * "Counts" KPI for the Alerts v2 page — a table of episode counts grouped by one
 * field (and optionally a second), the v2 analogue of the v1 counts panel. The
 * group-by dropdowns are populated by discovering the real keys in `data`.
 */
export const CountsPanel = ({ query, timeRange }: CountsPanelProps) => {
  const [storedField0, setStoredField0] = useLocalStorage<string>(
    FIELD0_STORAGE_KEY,
    DEFAULT_FIELD0
  );
  const [storedField1, setStoredField1] = useLocalStorage<string>(
    FIELD1_STORAGE_KEY,
    DEFAULT_FIELD1
  );
  const field0 = storedField0 ?? DEFAULT_FIELD0;
  const field1 = storedField1 ?? DEFAULT_FIELD1;

  const { fields } = useEpisodeFields(query, timeRange);
  const field0Options = useMemo(() => toSelectOptions(fields, field0), [fields, field0]);
  const field1Options = useMemo(
    () => [NONE_OPTION, ...toSelectOptions(fields, field1)],
    [fields, field1]
  );

  const { data, isLoading, error, inspect } = useCountsData(query, timeRange, field0, field1);

  const columns = useMemo<Array<EuiBasicTableColumn<CountsDatum>>>(() => {
    const cols: Array<EuiBasicTableColumn<CountsDatum>> = [
      {
        field: 'col0',
        name: field0,
        truncateText: true,
        render: (value: string) => (
          <EuiText size="xs" className="eui-textTruncate">
            {value}
          </EuiText>
        ),
      },
    ];
    if (field1) {
      cols.push({
        field: 'col1',
        name: field1,
        truncateText: true,
        render: (value: string | null) => (
          <EuiText size="xs" className="eui-textTruncate">
            {value ?? ''}
          </EuiText>
        ),
      });
    }
    cols.push({
      field: 'count',
      name: i18n.translate('xpack.securitySolution.alertsV2.counts.countColumn', {
        defaultMessage: 'Count',
      }),
      dataType: 'number',
      sortable: true,
      width: '20%',
    });
    return cols;
  }, [field0, field1]);

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="alertsV2CountsPanel">
      <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.securitySolution.alertsV2.counts.stackBy', {
              defaultMessage: 'Stack by',
            })}
            display="compressed"
          >
            <EuiSelect
              compressed
              options={field0Options}
              value={field0}
              onChange={(event) => setStoredField0(event.target.value)}
              data-test-subj="alertsV2CountsField0"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.securitySolution.alertsV2.counts.thenBy', {
              defaultMessage: 'Then by',
            })}
            display="compressed"
          >
            <EuiSelect
              compressed
              options={field1Options}
              value={field1}
              onChange={(event) => setStoredField1(event.target.value)}
              data-test-subj="alertsV2CountsField1"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EsqlInspectButton inspect={inspect} title={TITLE} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={i18n.translate('xpack.securitySolution.alertsV2.counts.error', {
            defaultMessage: 'Unable to load counts',
          })}
        >
          {error.message}
        </EuiCallOut>
      ) : (
        <EuiInMemoryTable
          data-test-subj="alertsV2CountsTable"
          columns={columns}
          items={data}
          loading={isLoading}
          pagination={PAGINATION}
          sorting
        />
      )}
    </EuiPanel>
  );
};
