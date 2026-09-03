/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

type VersionOption<TKey extends string> = EuiSelectableOption & { key: TKey };

export interface FaceliftHeaderVersionSelectProps<TKey extends string> {
  label: string;
  ariaLabel: string;
  options: Array<{ key: TKey; label: string }>;
  value: TKey;
  onChange: (version: TKey) => void;
  /** Prefix for data-test-subj ids, e.g. `eaFaceliftVersion` → `…Select`, `…HeaderControl`. */
  testIdPrefix: string;
}

/**
 * Filter-style single-select used by Prototype / Metrics version chrome controls.
 */
export function FaceliftHeaderVersionSelect<TKey extends string>({
  label,
  ariaLabel,
  options: versionOptions,
  value,
  onChange,
  testIdPrefix,
}: FaceliftHeaderVersionSelectProps<TKey>) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedLabel =
    versionOptions.find((option) => option.key === value)?.label ?? value;

  const options = useMemo<Array<VersionOption<TKey>>>(
    () =>
      versionOptions.map((option) => ({
        key: option.key,
        label: option.label,
        checked: option.key === value ? 'on' : undefined,
      })),
    [value, versionOptions]
  );

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const onSelectableChange = useCallback(
    (newOptions: Array<VersionOption<TKey>>) => {
      const selected = newOptions.find((option) => option.checked === 'on');
      if (selected?.key) {
        onChange(selected.key);
      }
      setIsPopoverOpen(false);
    },
    [onChange]
  );

  const button = (
    <EuiFilterGroup compressed>
      <EuiFilterButton
        iconType="chevronSingleDown"
        grow={false}
        hasActiveFilters
        isSelected={isPopoverOpen}
        onClick={onButtonClick}
        aria-label={ariaLabel}
        data-test-subj={`${testIdPrefix}Select`}
      >
        {selectedLabel}
      </EuiFilterButton>
    </EuiFilterGroup>
  );

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj={`${testIdPrefix}HeaderControl`}
    >
      <EuiFlexItem grow={false}>
        <EuiFormLabel>{label}</EuiFormLabel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={button}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          <EuiSelectable<VersionOption<TKey>>
            aria-label={ariaLabel}
            options={options}
            onChange={onSelectableChange}
            singleSelection={true}
            searchable={false}
            listProps={{ showIcons: true }}
            data-test-subj={`${testIdPrefix}Selectable`}
          >
            {(list) => (
              <div
                css={css`
                  width: ${euiTheme.base * 8}px; /* 128px — fits v.1 / v.2 / … */
                `}
              >
                {list}
              </div>
            )}
          </EuiSelectable>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
