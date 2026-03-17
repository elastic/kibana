/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { hasSloGroupBy } from '../overview/slo_overview_panel_content';
import type { SloItem } from './types';

interface Props {
  initialSlos?: SloItem[];
  onSelected: (slos: SLOWithSummaryResponse[] | SLOWithSummaryResponse | undefined) => void;
  hasError?: boolean;
  singleSelection?: boolean;
}

const SLO_REQUIRED = i18n.translate('xpack.slo.sloEmbeddable.config.errors.sloRequired', {
  defaultMessage: 'SLO is required.',
});

const ALL_INSTANCES_LABEL = i18n.translate('xpack.slo.sloEmbeddable.config.allInstancesLabel', {
  defaultMessage: 'All instances',
});

const VALUE_SEP = '\u001F';

function getSloId(slo: SloItem | SLOWithSummaryResponse): string {
  return (slo as SloItem).slo_id ?? (slo as SLOWithSummaryResponse).id ?? '';
}
function getSloInstanceId(slo: SloItem | SLOWithSummaryResponse): string {
  return (slo as SloItem).slo_instance_id ?? (slo as SLOWithSummaryResponse).instanceId ?? '';
}

function toOptionValue(sloId: string, instanceId: string): string {
  return `${sloId}${VALUE_SEP}${instanceId}`;
}
function parseOptionValue(value: string): [string, string] {
  const idx = value.indexOf(VALUE_SEP);
  return idx >= 0 ? [value.slice(0, idx), value.slice(idx + 1)] : [value, ''];
}

function getGroupBy(slo: SloItem | SLOWithSummaryResponse): string[] | string | undefined {
  return (slo as SloItem).group_by ?? (slo as SLOWithSummaryResponse).groupBy;
}

function mapSlosToOptions(slos: SloItem[] | SLOWithSummaryResponse[] | undefined) {
  return (
    slos?.map((slo) => {
      const id = getSloId(slo);
      const instanceId = getSloInstanceId(slo);
      const isGroupedWithAll = instanceId === ALL_VALUE && hasSloGroupBy(getGroupBy(slo));
      const label =
        instanceId !== ALL_VALUE
          ? `${slo.name} (${instanceId})`
          : isGroupedWithAll
          ? `${slo.name} (${ALL_INSTANCES_LABEL})`
          : slo.name;
      return {
        label,
        value: toOptionValue(id, instanceId),
      };
    }) ?? []
  );
}

/** Build options from API results, adding "All instances" per grouped SLO. */
function buildOptionsFromResults(
  results: SLOWithSummaryResponse[]
): Array<EuiComboBoxOptionOption<string>> {
  const options: Array<EuiComboBoxOptionOption<string>> = [];
  const seen = new Set<string>();

  const byId = new Map<string, SLOWithSummaryResponse[]>();
  for (const slo of results) {
    const list = byId.get(slo.id) ?? [];
    list.push(slo);
    byId.set(slo.id, list);
  }

  for (const [id, group] of byId) {
    const first = group[0];
    const groupBy = [first.groupBy].flat().filter(Boolean) as string[];
    const isGrouped = hasSloGroupBy(groupBy) || new Set(group.map((s) => s.instanceId)).size > 1;

    if (isGrouped) {
      const allValue = toOptionValue(id, ALL_VALUE);
      if (!seen.has(allValue)) {
        seen.add(allValue);
        options.push({
          label: `${first.name} (${ALL_INSTANCES_LABEL})`,
          value: allValue,
        });
      }
    }

    for (const slo of group) {
      const value = toOptionValue(id, slo.instanceId);
      if (!seen.has(value)) {
        seen.add(value);
        options.push({
          label: slo.instanceId !== ALL_VALUE ? `${slo.name} (${slo.instanceId})` : slo.name,
          value,
        });
      }
    }
  }

  return options;
}

/** Create synthetic SLO for "All instances" selection (API does not return id-* for grouped SLOs). */
function toSloWithSummary(
  sloId: string,
  instanceId: string,
  results: SLOWithSummaryResponse[]
): SLOWithSummaryResponse {
  const match = results.find((s) => s.id === sloId);
  if (match) {
    return { ...match, instanceId };
  }
  return {
    id: sloId,
    instanceId,
    name: '',
    groupBy: [],
    summary: {
      status: 'NO_DATA',
      sliValue: 0,
      errorBudget: { initial: 0, consumed: 0, remaining: 1 },
    },
    groupings: {},
  } as unknown as SLOWithSummaryResponse;
}

export function SloSelector({ initialSlos, onSelected, hasError, singleSelection }: Props) {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    mapSlosToOptions(initialSlos)
  );
  const [searchValue, setSearchValue] = useState<string>('');
  const query = `${searchValue}*`;
  const { isLoading, data: sloList } = useFetchSloList({
    kqlQuery: `slo.name: (${query}) or slo.instanceId.text: (${query})`,
    perPage: 100,
  });

  useEffect(() => {
    const isLoadedWithData = !isLoading && sloList?.results !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? buildOptionsFromResults(sloList.results)
      : [];
    setOptions(opts);
  }, [isLoading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    if (opts.length < 1 || !sloList?.results) {
      onSelected(undefined);
      return;
    }
    const selectedSlos = opts.map((opt) => {
      const [sloId, instanceId] = parseOptionValue(opt.value!);
      const match = sloList.results!.find((s) => toOptionValue(s.id, s.instanceId) === opt.value);
      if (match) return match;
      return toSloWithSummary(sloId, instanceId, sloList.results!);
    });
    onSelected(singleSelection ? selectedSlos[0] : selectedSlos);
  };

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 300),
    []
  );

  return (
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      error={hasError ? SLO_REQUIRED : undefined}
      label={i18n.translate('xpack.slo.embeddable.sloSelectorLabel', {
        defaultMessage: 'SLO',
      })}
    >
      <EuiComboBox
        aria-label={i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.ariaLabel', {
          defaultMessage: 'SLO',
        })}
        placeholder={i18n.translate('xpack.slo.sloEmbeddable.config.sloSelector.placeholder', {
          defaultMessage: 'Select a SLO',
        })}
        data-test-subj="sloSelector"
        options={options}
        selectedOptions={selectedOptions}
        async
        isLoading={isLoading}
        onChange={onChange}
        fullWidth
        onSearchChange={onSearchChange}
        isInvalid={hasError}
        singleSelection={singleSelection ? { asPlainText: true } : undefined}
      />
    </EuiFormRow>
  );
}
