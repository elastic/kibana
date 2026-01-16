/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { ALL_VALUE } from '@kbn/slo-schema';
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
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchAfter, setSearchAfter] = useState<string | undefined>();
  const selectedOptionsRef = useRef(selectedOptions);
  const onSelectedRef = useRef(onSelected);

  // Keep refs in sync
  useEffect(() => {
    selectedOptionsRef.current = selectedOptions;
  }, [selectedOptions]);

  useEffect(() => {
    onSelectedRef.current = onSelected;
  }, [onSelected]);

  const { isLoading, data: instancesData } = useFetchSloInstances({
    sloId,
    remoteName,
    search: searchValue.trim() || undefined,
    size: 100,
    searchAfter,
  });

  const options = useMemo(() => {
    const instanceOptions =
      instancesData?.results.map((instance) => ({
        label: instance.instanceId,
        value: instance.instanceId,
      })) ?? [];

    return [ALL_OPTION, ...instanceOptions];
  }, [instancesData]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
    // Allow clearing selection to enable searching
    if (opts.length === 0) {
      setSelectedOptions([]);
      onSelected(undefined);
      return;
    }

    const isAllSelected = opts.find((opt) => opt.value === ALL_VALUE);
    const prevIsAllSelected = selectedOptions.find((opt) => opt.value === ALL_VALUE);

    if (isAllSelected && !prevIsAllSelected) {
      setSelectedOptions([ALL_OPTION]);
      onSelected(ALL_VALUE);
    } else if (isAllSelected && prevIsAllSelected) {
      // If "All" is already selected and user tries to select it again, do nothing
      return;
    } else {
      setSelectedOptions(opts);
      const selectedInstanceId = opts.length > 0 ? opts[0].value : undefined;
      onSelected(selectedInstanceId);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    // When user starts typing, clear selection to allow free searching
    if (value && selectedOptionsRef.current.length > 0) {
      setSelectedOptions([]);
      onSelectedRef.current(undefined);
    }
    setSearchValue(value);
    setSearchAfter(undefined); // Reset pagination when search changes
  }, []);

  const onSearchChange = useMemo(() => debounce(handleSearchChange, 300), [handleSearchChange]);
  useEffect(() => {
    return () => {
      onSearchChange.cancel();
    };
  }, [onSearchChange]);

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
          {
            defaultMessage: 'Select an instance or choose all',
          }
        )}
        data-test-subj="sloInstanceSelector"
        options={options}
        selectedOptions={selectedOptions}
        async
        isLoading={isLoading}
        onChange={onChange}
        fullWidth
        onSearchChange={onSearchChange}
        isInvalid={hasError}
        singleSelection
        isClearable
      />
    </EuiFormRow>
  );
}
