/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useFetchSloList } from '../hooks/use_fetch_slo_list';
export interface SloItem {
  id: string;
  instanceId?: string;
  name?: string;
  groupBy?: string;
}

interface Props {
  value?: SloItem;
  onSelected: (vals: { slo?: { id: string; instanceId?: string }; all?: boolean }) => void;
  hasError?: boolean;
}

type Option = EuiComboBoxOptionOption<string>;
const mapSlosToOptions = (slos: SLOWithSummaryResponse[] | SloItem[] | undefined) =>
  slos?.map((slo) => ({
    label:
      slo.instanceId !== ALL_VALUE
        ? `${slo.name ?? slo.id} (${slo.instanceId})`
        : slo.name ?? slo.id,
    value: `${slo.id}-${slo.instanceId}`,
  })) ?? [];

export function SloSelector({ value, onSelected, hasError }: Props) {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const query = `${searchValue}*`;
  const { isLoading, data: sloList } = useFetchSloList({
    kqlQuery: `slo.name: (${query}) or slo.instanceId.text: (${query})`,
    perPage: 100,
  });

  useEffect(() => {
    const isLoadedWithData = !isLoading && sloList?.results !== undefined;
    const opts: Option[] = isLoadedWithData ? mapSlosToOptions(sloList?.results) : [];
    setOptions(opts);
  }, [isLoading, sloList]);

  useEffect(() => {
    if (value && sloList?.results.length) {
      const selectedSlos = sloList.results.filter(
        (slo) => value.id === slo.id && value.instanceId === slo.instanceId
      );
      const newOpts = mapSlosToOptions(selectedSlos);
      if (value?.id === ALL_VALUE) {
        newOpts.unshift(ALL_OPTION);
      }
      setSelectedOptions(newOpts);
    }
  }, [value, sloList]);

  const onChange = (opts: Option[]) => {
    const isAllSelected = opts.find((opt) => opt.value === ALL_VALUE);
    const prevIsAllSelected = selectedOptions.find((opt) => opt.value === ALL_VALUE);
    if (isAllSelected && !prevIsAllSelected) {
      setSelectedOptions([ALL_OPTION]);
      onSelected({ all: true });
    } else {
      setSelectedOptions(opts);
      const selectedSlos =
        opts.length >= 1
          ? sloList!.results?.filter((slo) =>
              opts.find((opt) => opt.value === `${slo.id}-${slo.instanceId}`)
            )
          : [];
      onSelected({
        slo: selectedSlos.map((slo) => ({ id: slo.id, instanceId: slo.instanceId }))[0],
      });
    }
  };

  const onSearchChange = useMemo(
    () =>
      debounce((val: string) => {
        setSearchValue(val);
      }, 300),
    []
  );

  return (
    <EuiComboBox
      async
      compressed
      aria-label={SLO_LABEL}
      placeholder={SLO_SELECTOR}
      data-test-subj="sloSelector"
      options={[ALL_OPTION, ...options]}
      selectedOptions={selectedOptions}
      isLoading={isLoading}
      onChange={onChange}
      fullWidth
      onSearchChange={onSearchChange}
      isInvalid={hasError}
      singleSelection={{ asPlainText: true }}
    />
  );
}

const ALL_OPTION = {
  label: i18n.translate('xpack.observability.sloEmbeddable.config.sloSelector.all', {
    defaultMessage: 'All SLOs',
  }),
  value: ALL_VALUE,
};
export const SLO_SELECTOR = i18n.translate(
  'xpack.observability.sloEmbeddable.config.sloSelector.placeholder',
  {
    defaultMessage: 'Select a SLO',
  }
);

export const SLO_LABEL = i18n.translate(
  'xpack.observability.sloEmbeddable.config.sloSelector.ariaLabel',
  {
    defaultMessage: 'SLO',
  }
);
