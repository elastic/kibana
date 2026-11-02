/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  onSelected: (slos: SloItem[] | undefined) => void;
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

/** Session cache: slo_id -> { name, groupBy } for instant display when reopening config */
const sloNameCache = new Map<string, { name: string; groupBy: string[] }>();

function populateNameCache(slos: SLOWithSummaryResponse[]) {
  for (const slo of slos) {
    const groupBy = [slo.groupBy].flat().filter(Boolean) as string[];
    if (!sloNameCache.has(slo.id)) {
      sloNameCache.set(slo.id, { name: slo.name, groupBy });
    }
  }
}

function getNameLookupFromCache(
  slos: Array<{ slo_id: string; slo_instance_id: string }>
): Map<string, { name: string; groupBy?: string[] }> | null {
  const map = new Map<string, { name: string; groupBy?: string[] }>();
  for (const slo of slos) {
    const cached = sloNameCache.get(slo.slo_id);
    if (!cached) return null;
    map.set(toOptionValue(slo.slo_id, slo.slo_instance_id), cached);
  }
  return map;
}

function toOptionValue(sloId: string, instanceId: string): string {
  return `${sloId}${VALUE_SEP}${instanceId}`;
}
function parseOptionValue(value: string): [string, string] {
  const idx = value.indexOf(VALUE_SEP);
  return idx >= 0 ? [value.slice(0, idx), value.slice(idx + 1)] : [value, ''];
}

function deduplicateSloItems(slos: SloItem[]): SloItem[] {
  const seen = new Set<string>();
  return slos.filter((slo) => {
    const key = `${slo.slo_id}${VALUE_SEP}${slo.slo_instance_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapSlosToOptions(
  slos: SloItem[] | undefined,
  nameLookup?: Map<string, { name: string; groupBy?: string[] }>
) {
  return (
    slos?.map((slo) => {
      const value = toOptionValue(slo.slo_id, slo.slo_instance_id);
      const entry = nameLookup?.get(value);
      const name = entry?.name;
      let label: string;
      if (name) {
        label =
          slo.slo_instance_id !== ALL_VALUE
            ? `${name} (${slo.slo_instance_id})`
            : hasSloGroupBy(entry?.groupBy)
            ? `${name} (${ALL_INSTANCES_LABEL})`
            : name;
      } else {
        label =
          slo.slo_instance_id !== ALL_VALUE ? `${slo.slo_id} (${slo.slo_instance_id})` : slo.slo_id;
      }
      return { label, value };
    }) ?? []
  );
}

/** Build options from API results, adding "All instances" per grouped SLO. */
function buildOptionsFromResults(
  results: SLOWithSummaryResponse[]
): EuiComboBoxOptionOption<string>[] {
  const options: EuiComboBoxOptionOption<string>[] = [];
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
    const allValue = toOptionValue(id, ALL_VALUE);

    if (isGrouped && !seen.has(allValue)) {
      seen.add(allValue);
      options.push({ label: `${first.name} (${ALL_INSTANCES_LABEL})`, value: allValue });
    }

    for (const slo of group) {
      const value = toOptionValue(id, slo.instanceId);
      if (!seen.has(value)) {
        seen.add(value);
        const label = slo.instanceId !== ALL_VALUE ? `${slo.name} (${slo.instanceId})` : slo.name;
        options.push({ label, value });
      }
    }
  }

  return options;
}

/**
 * Normalize selection to avoid redundancy between "All instances" and specific instances.
 * - When "All instances" is selected for an SLO: remove its child instances (they're encompassed).
 * - When a specific instance is selected for an SLO that has "All instances": remove "All instances"
 *   (user is narrowing from "all" to a specific one).
 * Uses previous selection to infer intent when both "All" and instances are present.
 */
function normalizeSelection(
  opts: Array<EuiComboBoxOptionOption<string>>,
  previous: Array<EuiComboBoxOptionOption<string>>
): Array<EuiComboBoxOptionOption<string>> {
  const prevBySloId = new Map<string, { hadAll: boolean; hadInstances: boolean }>();
  for (const opt of previous) {
    const [sloId, instanceId] = parseOptionValue(opt.value ?? '');
    let entry = prevBySloId.get(sloId);
    if (!entry) {
      entry = { hadAll: false, hadInstances: false };
      prevBySloId.set(sloId, entry);
    }
    if (instanceId === ALL_VALUE) entry.hadAll = true;
    else entry.hadInstances = true;
  }

  const bySloId = new Map<
    string,
    { all?: EuiComboBoxOptionOption<string>; instances: EuiComboBoxOptionOption<string>[] }
  >();
  for (const opt of opts) {
    const [sloId, instanceId] = parseOptionValue(opt.value ?? '');
    let entry = bySloId.get(sloId);
    if (!entry) {
      entry = { instances: [] };
      bySloId.set(sloId, entry);
    }
    if (instanceId === ALL_VALUE) {
      entry.all = opt;
    } else {
      entry.instances.push(opt);
    }
  }

  const result: Array<EuiComboBoxOptionOption<string>> = [];
  for (const [sloId, entry] of bySloId) {
    if (entry.all && entry.instances.length > 0) {
      const prev = prevBySloId.get(sloId);
      if (prev?.hadAll && !prev?.hadInstances) {
        result.push(...entry.instances);
      } else {
        result.push(entry.all);
      }
    } else if (entry.all) {
      result.push(entry.all);
    } else {
      result.push(...entry.instances);
    }
  }
  return result;
}

export function SloSelector({ initialSlos, onSelected, hasError, singleSelection }: Props) {
  const dedupedInitialSlosRef = useRef(deduplicateSloItems(initialSlos ?? []));
  const dedupedInitialSlos = dedupedInitialSlosRef.current;
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    () => {
      const cached = dedupedInitialSlos.length ? getNameLookupFromCache(dedupedInitialSlos) : null;
      return mapSlosToOptions(dedupedInitialSlos, cached ?? undefined);
    }
  );
  const [searchValue, setSearchValue] = useState<string>('');
  const [dropdownOpened, setDropdownOpened] = useState(false);
  const query = `${searchValue}*`;

  const initialSloIds = useMemo(
    () => (dedupedInitialSlos.length ? [...new Set(dedupedInitialSlos.map((s) => s.slo_id))] : []),
    [dedupedInitialSlos]
  );
  const initialKql = useMemo(
    () => initialSloIds.map((id) => `slo.id:"${id}"`).join(' or '),
    [initialSloIds]
  );

  const { data: initialSlosData } = useFetchSloList({
    kqlQuery: initialKql,
    perPage: Math.max(100, initialSloIds.length * 2),
    disabled: initialSloIds.length === 0,
  });

  const nameLookup = useMemo(() => {
    if (!initialSlosData?.results?.length) return null;
    const map = new Map<string, { name: string; groupBy?: string[] }>();
    const getGroupBy = (s: SLOWithSummaryResponse) =>
      [s.groupBy].flat().filter(Boolean) as string[];
    for (const slo of initialSlosData.results) {
      const key = toOptionValue(slo.id, slo.instanceId);
      if (!map.has(key)) map.set(key, { name: slo.name, groupBy: getGroupBy(slo) });
      const starKey = toOptionValue(slo.id, ALL_VALUE);
      if (!map.has(starKey)) map.set(starKey, { name: slo.name, groupBy: getGroupBy(slo) });
    }
    populateNameCache(initialSlosData.results);
    return map;
  }, [initialSlosData]);

  useEffect(() => {
    if (!dedupedInitialSlos.length || !nameLookup) return;
    setSelectedOptions(mapSlosToOptions(dedupedInitialSlos, nameLookup));
  }, [dedupedInitialSlos, nameLookup]);

  const { isLoading, data: sloList } = useFetchSloList({
    kqlQuery: `slo.name: (${query}) or slo.instanceId.text: (${query})`,
    perPage: 100,
    disabled: !dropdownOpened,
  });

  const optionsRef = useRef<EuiComboBoxOptionOption<string>[]>([]);
  const options = useMemo(() => {
    const isLoadedWithData = !isLoading && sloList?.results !== undefined;
    if (isLoadedWithData) {
      populateNameCache(sloList!.results);
      const next = buildOptionsFromResults(sloList!.results);
      optionsRef.current = next;
      return next;
    }
    return optionsRef.current;
  }, [isLoading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    const normalized = normalizeSelection(opts, selectedOptions);
    setSelectedOptions(normalized);
    if (normalized.length < 1) {
      onSelected(undefined);
      return;
    }
    const selectedSlos: SloItem[] = normalized.map((opt) => {
      const [sloId, instanceId] = parseOptionValue(opt.value!);
      return { slo_id: sloId, slo_instance_id: instanceId };
    });
    onSelected(selectedSlos);
  };

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
      }, 150),
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
        isLoading={
          optionsRef.current.length === 0 && dropdownOpened && !sloList?.results && isLoading
        }
        onChange={onChange}
        fullWidth
        onFocus={() => setDropdownOpened(true)}
        onSearchChange={onSearchChange}
        isInvalid={hasError}
        singleSelection={singleSelection ? { asPlainText: true } : undefined}
      />
    </EuiFormRow>
  );
}
