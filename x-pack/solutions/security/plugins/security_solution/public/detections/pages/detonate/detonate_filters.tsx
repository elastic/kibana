/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiFilterGroup, EuiPopover, EuiSelectable } from '@elastic/eui';
import * as i18n from './translations';

interface MultiFilterProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  testId: string;
}

const MultiFilter = memo(({ label, options, selected, onChange, testId }: MultiFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      options.map((o) => ({
        label: o.label,
        key: o.value,
        checked: selected.includes(o.value) ? 'on' : undefined,
      })),
    [options, selected]
  );
  const handleChange = useCallback(
    (next: EuiSelectableOption[]) =>
      onChange(next.filter((o) => o.checked === 'on').map((o) => String(o.key))),
    [onChange]
  );
  return (
    <EuiPopover
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          data-test-subj={testId}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={label}
    >
      <EuiSelectable
        aria-label={label}
        options={selectableOptions}
        onChange={handleChange}
        listProps={{ css: { minWidth: 200 } }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
});
MultiFilter.displayName = 'MultiFilter';

export interface DetonateFiltersValue {
  verdicts: string[];
  submitters: string[];
  statuses: string[];
}

interface DetonateFiltersProps {
  value: DetonateFiltersValue;
  onChange: (value: DetonateFiltersValue) => void;
  verdictOptions: Array<{ value: string; label: string }>;
  submitterOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}

/** Verdict, "Submitted by" and Status filters shown next to the search bar. */
export const DetonateFilters = memo(
  ({ value, onChange, verdictOptions, submitterOptions, statusOptions }: DetonateFiltersProps) => (
    <EuiFilterGroup data-test-subj="detonateFilters">
      <MultiFilter
        label={i18n.FILTER_VERDICT}
        options={verdictOptions}
        selected={value.verdicts}
        onChange={(verdicts) => onChange({ ...value, verdicts })}
        testId="detonateFilterVerdict"
      />
      <MultiFilter
        label={i18n.FILTER_SUBMITTED_BY}
        options={submitterOptions}
        selected={value.submitters}
        onChange={(submitters) => onChange({ ...value, submitters })}
        testId="detonateFilterSubmittedBy"
      />
      <MultiFilter
        label={i18n.FILTER_STATUS}
        options={statusOptions}
        selected={value.statuses}
        onChange={(statuses) => onChange({ ...value, statuses })}
        testId="detonateFilterStatus"
      />
    </EuiFilterGroup>
  )
);
DetonateFilters.displayName = 'DetonateFilters';
