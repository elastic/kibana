/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import useDebounce from 'react-use/lib/useDebounce';
import { useFetchSloInstances } from '../../../hooks/use_fetch_slo_instances';

interface Props {
  sloId: string;
  remoteName?: string;
  onSelected: (instanceId: string | undefined) => void;
  hasError?: boolean;
}

const ALL_OPTION: EuiComboBoxOptionOption<string> = {
  label: i18n.translate('xpack.slo.sloEmbeddable.config.allInstancesLabel', {
    defaultMessage: 'All instances',
  }),
  value: ALL_VALUE,
};

export function SloInstanceSelector({ sloId, remoteName, onSelected, hasError }: Props) {
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [search, setSearch] = useState<string>();
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useDebounce(() => setDebouncedSearch(search), 500, [search]);

  const { isLoading, data: instancesData } = useFetchSloInstances({
    sloId,
    remoteName,
    search: debouncedSearch?.trim(),
    size: 100,
  });

  const options = [
    ALL_OPTION,
    ...(instancesData?.results.map((instance) => ({
      label: instance.instanceId,
      value: instance.instanceId,
    })) ?? []),
  ];

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    if (opts.length === 0) {
      setSelectedOptions([]);
      onSelected(undefined);
      return;
    }
    setSelectedOptions(opts);
    const selectedInstanceId = opts.length > 0 ? opts[0].value : undefined;
    onSelected(selectedInstanceId);
  };

  return (
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      label={i18n.translate('xpack.slo.embeddable.sloInstanceSelectorLabel', {
        defaultMessage: 'Instance',
      })}
    >
      <EuiComboBox
        aria-label={i18n.translate('xpack.slo.sloEmbeddable.config.sloInstanceSelector.ariaLabel', {
          defaultMessage: 'SLO Instance',
        })}
        placeholder={i18n.translate(
          'xpack.slo.sloEmbeddable.config.sloInstanceSelector.placeholder',
          { defaultMessage: 'Select an instance or choose all' }
        )}
        data-test-subj="sloInstanceSelector"
        options={options}
        selectedOptions={selectedOptions}
        async
        isLoading={isLoading}
        onChange={onChange}
        fullWidth
        onSearchChange={(searchValue) => setSearch(searchValue)}
        isInvalid={hasError}
        singleSelection={true}
      />
    </EuiFormRow>
  );
}
