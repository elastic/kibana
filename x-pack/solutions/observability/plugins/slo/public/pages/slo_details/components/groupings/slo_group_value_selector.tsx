/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiButtonIcon, EuiComboBox, EuiCopy, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SLOS_BASE_PATH } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useFetchSloGroupingValues } from '../../hooks/use_fetch_slo_grouping_values';
import { useGetQueryParams } from '../../hooks/use_get_query_params';

interface Props {
  id: string;
  instanceId?: string;
  groupingKey: string;
  groupingValue?: string | number;
  onSelect: (newValue: string | number) => void;
}

interface Field {
  label: string;
  value: string | number;
}

export function SloGroupValueSelector({
  id,
  instanceId = ALL_VALUE,
  groupingKey,
  groupingValue,
  onSelect,
}: Props) {
  const isAvailable = window.location.pathname.includes(SLOS_BASE_PATH);

  const { remoteName } = useGetQueryParams();

  const [options, setOptions] = useState<Field[]>([]);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(undefined);
  useDebounce(() => setDebouncedSearch(search), 500, [search]);

  const { isLoading, isError, data } = useFetchSloGroupingValues({
    sloId: id,
    groupingKey,
    instanceId,
    search: debouncedSearch,
    remoteName,
  });

  useEffect(() => {
    if (data) {
      setSearch(undefined);
      setDebouncedSearch(undefined);
      setOptions(data.values.map(toField));
    }
  }, [data]);

  const onChange = (selected: Array<EuiComboBoxOptionOption<string | number>>) => {
    const newValue = selected[0].value;
    if (!newValue) return;
    onSelect(newValue);
  };

  const selectGroupValueLabel = i18n.translate('xpack.slo.sLOGroupingValueSelector.placeholder', {
    defaultMessage: 'Select a group value',
  });

  const copyLabel = i18n.translate('xpack.slo.sLOGroupingValueSelector.copyButton.label', {
    defaultMessage: 'Copy SLO Grouping Value',
  });

  return (
    <EuiFlexItem grow={false}>
      <EuiComboBox<string | number>
        css={css`
          max-width: 500px;
        `}
        isClearable={false}
        compressed
        prepend={groupingKey}
        append={
          groupingValue !== undefined ? (
            <EuiCopy textToCopy={String(groupingValue)}>
              {(copy) => (
                <EuiButtonIcon
                  data-test-subj="sloSLOGroupingValueSelectorButton"
                  color="text"
                  iconType="copyClipboard"
                  onClick={copy}
                  aria-label={copyLabel}
                />
              )}
            </EuiCopy>
          ) : (
            <EuiButtonIcon
              data-test-subj="sloSLOGroupingValueSelectorButton"
              color="text"
              iconType="copyClipboard"
              aria-label={copyLabel}
              disabled
            />
          )
        }
        singleSelection={{ asPlainText: true }}
        options={options}
        isLoading={isLoading}
        isDisabled={isError || !isAvailable}
        aria-label={selectGroupValueLabel}
        placeholder={selectGroupValueLabel}
        selectedOptions={groupingValue !== undefined ? [toField(groupingValue)] : []}
        onChange={onChange}
        truncationProps={{
          truncation: 'end',
        }}
        onSearchChange={(searchValue: string) => {
          if (searchValue !== '') {
            setSearch(searchValue);
          }
        }}
      />
    </EuiFlexItem>
  );
}

function toField(value: string | number): Field {
  return { label: String(value), value };
}
