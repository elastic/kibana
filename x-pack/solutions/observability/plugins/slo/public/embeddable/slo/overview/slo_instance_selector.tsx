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
import { ALL_VALUE } from '@kbn/slo-schema';
import { useFetchSloInstances } from '../../../hooks/use_fetch_slo_instances';

interface Props {
  sloId: string;
  initialInstanceId?: string;
  onSelected: (instanceId: string | undefined) => void;
  hasError?: boolean;
}

const ALL_OPTION: EuiComboBoxOptionOption<string> = {
  label: i18n.translate('xpack.slo.sloEmbeddable.config.allInstancesLabel', {
    defaultMessage: 'All instances',
  }),
  value: ALL_VALUE,
};

export function SloInstanceSelector({
  sloId,
  initialInstanceId,
  onSelected,
  hasError,
}: Props) {
  const [selectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [searchValue, setSearchValue] = useState<string>('');
  const [searchAfter, setSearchAfter] = useState<string | undefined>();

  const { isLoading, data: instancesData } = useFetchSloInstances({
    sloId,
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

  // Set initial selection
  useEffect(() => {
    if (instancesData?.results === undefined) {
      return;
    }

    // If we already have a selection, don't override it
    if (selectedOptions.length > 0) {
      return;
    }

    if (initialInstanceId === undefined || initialInstanceId === ALL_VALUE) {
      setSelectedOptions([ALL_OPTION]);
      onSelected(ALL_VALUE);
    } else {
      const initialInstance = instancesData.results.find(
        (instance) => instance.instanceId === initialInstanceId
      );
      if (initialInstance) {
        setSelectedOptions([
          {
            label: initialInstance.instanceId,
            value: initialInstance.instanceId,
          },
        ]);
        onSelected(initialInstance.instanceId);
      } else {
        // If the initial instance is not found, default to ALL_VALUE
        setSelectedOptions([ALL_OPTION]);
        onSelected(ALL_VALUE);
      }
    }
  }, [initialInstanceId, instancesData, onSelected, selectedOptions.length]);

  const onChange = (opts: Array<EuiComboBoxOptionOption<string>>) => {
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

  const onSearchChange = useMemo(
    () =>
      debounce((value: string) => {
        setSearchValue(value);
        setSearchAfter(undefined); // Reset pagination when search changes
      }, 300),
    []
  );

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
        placeholder={i18n.translate('xpack.slo.sloEmbeddable.config.sloInstanceSelector.placeholder', {
          defaultMessage: 'Select an instance or choose all',
        })}
        data-test-subj="sloInstanceSelector"
        options={options}
        selectedOptions={selectedOptions}
        async
        isLoading={isLoading}
        onChange={onChange}
        fullWidth
        onSearchChange={onSearchChange}
        isInvalid={hasError}
        singleSelection={{ asPlainText: true }}
      />
    </EuiFormRow>
  );
}

