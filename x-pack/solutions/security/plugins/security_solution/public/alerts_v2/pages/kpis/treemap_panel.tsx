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
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  euiPaletteColorBlind,
  useEuiTheme,
} from '@elastic/eui';
import { Chart, Datum, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { EsqlInspectButton } from './esql_inspect_button';
import { useTreemapData } from './use_treemap_data';
import { useEpisodeFields } from './episode_fields';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.treemap.title', {
  defaultMessage: 'Treemap',
});

const CHART_HEIGHT = 320;
const NONE_OPTION = { value: '', text: 'None' };

const FIELD0_STORAGE_KEY = 'securitySolution.alertsV2.treemapField0';
const FIELD1_STORAGE_KEY = 'securitySolution.alertsV2.treemapField1';
const DEFAULT_FIELD0 = 'rule.id';
const DEFAULT_FIELD1 = 'host.name';

const toSelectOptions = (fields: string[], selected: string) => {
  const list = selected && !fields.includes(selected) ? [selected, ...fields] : fields;
  return list.map((field) => ({ value: field, text: field }));
};

export interface TreemapPanelProps {
  /** The page's ES|QL query — the chart aggregates on top of it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * "Treemap" KPI for the Alerts v2 page — episode counts grouped by one or two
 * fields, the v2 analogue of the v1 treemap (sized by count; v2 has no risk score
 * to color by).
 */
export const TreemapPanel = ({ query, timeRange }: TreemapPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const baseTheme = useElasticChartsTheme();

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

  const { data, isLoading, error, inspect } = useTreemapData(query, timeRange, field0, field1);

  // Deterministic categorical color per distinct group value.
  const fillColor = useMemo(() => {
    const distinct = Array.from(new Set(data.flatMap((d) => [d.group0, d.group1 ?? ''])));
    const palette = euiPaletteColorBlind({ rotations: Math.max(1, Math.ceil(distinct.length / 10)) });
    const colorByValue = new Map<string, string>();
    distinct.forEach((value, index) => colorByValue.set(value, palette[index % palette.length]));
    return (name: string) => colorByValue.get(String(name)) ?? euiTheme.colors.lightShade;
  }, [data, euiTheme]);

  const layers = useMemo(() => {
    const result = [
      {
        groupByRollup: (d: Datum) => d.group0,
        nodeLabel: (d: Datum) => `${d}`,
        shape: { fillColor },
      },
    ];
    if (field1) {
      result.push({
        groupByRollup: (d: Datum) => d.group1,
        nodeLabel: (d: Datum) => `${d}`,
        shape: { fillColor },
      });
    }
    return result;
  }, [field1, fillColor]);

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="alertsV2TreemapPanel">
      <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{TITLE}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.securitySolution.alertsV2.treemap.groupBy', {
              defaultMessage: 'Group by',
            })}
            display="compressed"
          >
            <EuiSelect
              compressed
              options={field0Options}
              value={field0}
              onChange={(event) => setStoredField0(event.target.value)}
              data-test-subj="alertsV2TreemapField0"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.securitySolution.alertsV2.treemap.thenBy', {
              defaultMessage: 'Then by',
            })}
            display="compressed"
          >
            <EuiSelect
              compressed
              options={field1Options}
              value={field1}
              onChange={(event) => setStoredField1(event.target.value)}
              data-test-subj="alertsV2TreemapField1"
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
          title={i18n.translate('xpack.securitySolution.alertsV2.treemap.error', {
            defaultMessage: 'Unable to load the treemap',
          })}
        >
          {error.message}
        </EuiCallOut>
      ) : data.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="alertsV2TreemapEmpty">
          {isLoading
            ? i18n.translate('xpack.securitySolution.alertsV2.treemap.loading', {
                defaultMessage: 'Loading…',
              })
            : i18n.translate('xpack.securitySolution.alertsV2.treemap.empty', {
                defaultMessage: 'No alerts in this time range.',
              })}
        </EuiText>
      ) : (
        <Chart size={{ height: CHART_HEIGHT }}>
          <Settings baseTheme={baseTheme} showLegend={false} />
          <Partition
            id="alertsV2Treemap"
            data={data}
            layout={PartitionLayout.treemap}
            valueAccessor={(d: Datum) => d.value as number}
            layers={layers}
          />
        </Chart>
      )}
    </EuiPanel>
  );
};
