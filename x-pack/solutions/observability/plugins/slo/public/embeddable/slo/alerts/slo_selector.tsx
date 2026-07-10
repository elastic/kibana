/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { SloItem } from './types';

interface Props {
  initialSlos?: SloItem[];
  onSelected: (slos: SLOWithSummaryResponse[] | SLOWithSummaryResponse | undefined) => void;
  hasError?: boolean;
  singleSelection?: boolean;
}

const SLO_REQUIRED = i18n.translate('xpack.slo.sloEmbeddable.config.errors.sloRequired', {
  defaultMessage: 'SLO is required.',
});

export const toSloOptionValue = (sloId: string, instanceId: string) => `${sloId}-${instanceId}`;

export type SloNameLookup = Map<string, { name: string }>;

/**
 * Resolves combo-box selections against a cache of known SLOs.
 * Avoids filtering against the current async search page, which drops prior
 * selections that are no longer in `sloList.results` (see #222637).
 */
export function resolveSelectedSlos(
  opts: Array<EuiComboBoxOptionOption<string>>,
  knownSlos: Map<string, SLOWithSummaryResponse>
): SLOWithSummaryResponse[] {
  return opts
    .map((opt) => knownSlos.get(opt.value ?? ''))
    .filter((slo): slo is SLOWithSummaryResponse => slo !== undefined);
}

export function rememberSlos(
  knownSlos: Map<string, SLOWithSummaryResponse>,
  slos: Array<SloItem | SLOWithSummaryResponse> | undefined
): void {
  slos?.forEach((slo) => {
    knownSlos.set(
      toSloOptionValue(slo.id, slo.instanceId),
      slo as unknown as SLOWithSummaryResponse
    );
  });
}

/** Build option labels from stored SLO items, optionally overriding names from a live lookup. */
export function mapSlosToOptions(
  slos: SloItem[] | SLOWithSummaryResponse[] | undefined,
  nameLookup?: SloNameLookup
): Array<EuiComboBoxOptionOption<string>> {
  return (
    slos?.map((slo) => {
      const value = toSloOptionValue(slo.id, slo.instanceId);
      const name = nameLookup?.get(value)?.name ?? slo.name;
      return {
        label: slo.instanceId !== ALL_VALUE ? `${name} (${slo.instanceId})` : name,
        value,
      };
    }) ?? []
  );
}

/** Map API results to option-value -> current name for selected SLOs (including `*` instances). */
export function buildNameLookup(results: SLOWithSummaryResponse[]): SloNameLookup {
  const map: SloNameLookup = new Map();
  for (const slo of results) {
    const key = toSloOptionValue(slo.id, slo.instanceId);
    if (!map.has(key)) {
      map.set(key, { name: slo.name });
    }
    const starKey = toSloOptionValue(slo.id, ALL_VALUE);
    if (!map.has(starKey)) {
      map.set(starKey, { name: slo.name });
    }
  }
  return map;
}

export function SloSelector({ initialSlos, onSelected, hasError, singleSelection }: Props) {
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    () => mapSlosToOptions(initialSlos)
  );
  const [searchValue, setSearchValue] = useState<string>('');
  const query = `${searchValue}*`;

  const initialSloIds = useMemo(
    () => (initialSlos?.length ? [...new Set(initialSlos.map((slo) => slo.id))] : []),
    [initialSlos]
  );
  const initialKql = useMemo(
    () => initialSloIds.map((id) => `slo.id:"${id}"`).join(' or '),
    [initialSloIds]
  );

  // Fetch current names for already-selected SLOs so renames show up when reopening config.
  const { data: initialSlosData } = useFetchSloList({
    kqlQuery: initialKql,
    perPage: Math.max(100, initialSloIds.length * 2),
    disabled: initialSloIds.length === 0,
  });

  const { isLoading, data: sloList } = useFetchSloList({
    kqlQuery: `slo.name: (${query}) or slo.instanceId.text: (${query})`,
    perPage: 100,
  });

  const knownSlosRef = useRef<Map<string, SLOWithSummaryResponse>>(new Map());

  const nameLookup = useMemo(() => {
    if (!initialSlosData?.results?.length) {
      return null;
    }
    return buildNameLookup(initialSlosData.results);
  }, [initialSlosData]);

  useEffect(() => {
    rememberSlos(knownSlosRef.current, initialSlos);
  }, [initialSlos]);

  useEffect(() => {
    if (!initialSlos?.length || !nameLookup) {
      return;
    }
    rememberSlos(knownSlosRef.current, initialSlosData?.results);
    setSelectedOptions(mapSlosToOptions(initialSlos, nameLookup));
  }, [initialSlos, initialSlosData?.results, nameLookup]);

  useEffect(() => {
    const isLoadedWithData = !isLoading && sloList?.results !== undefined;
    const opts: Array<EuiComboBoxOptionOption<string>> = isLoadedWithData
      ? mapSlosToOptions(sloList?.results)
      : [];
    setOptions(opts);
    rememberSlos(knownSlosRef.current, sloList?.results);
  }, [isLoading, sloList]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(opts);
    rememberSlos(knownSlosRef.current, sloList?.results);

    if (opts.length < 1) {
      onSelected(undefined);
      return;
    }

    const selectedSlos = resolveSelectedSlos(opts, knownSlosRef.current);
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
