/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { FieldValueSelection } from '@kbn/observability-shared-plugin/public';

export interface QuickFilterOption {
  value: string;
  label: string;
  tooltip?: string;
  count?: number;
}

interface Props {
  label: string;
  options: QuickFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  dataTestSubj?: string;
  isDisabled?: boolean;
  disabledTooltip?: string;
  singleSelection?: boolean;
}

/**
 * Adapter around the shared {@link FieldValueSelection} so the Certificates page
 * filters match the look and behaviour of the Monitors page filters. Cert filter
 * options carry a separate machine `value` (used in the API query) and display
 * `label`, so we map between the two since FieldValueSelection works on labels.
 */
export const CertQuickFilter: React.FC<Props> = ({
  label,
  options,
  selectedValues,
  onChange,
  dataTestSubj,
  isDisabled = false,
  disabledTooltip,
  singleSelection = false,
}) => {
  const [query, setQuery] = useState('');

  const { valueByLabel, labelByValue } = useMemo(() => {
    const byLabel = new Map(options.map(({ value, label: optionLabel }) => [optionLabel, value]));
    const byValue = new Map(options.map(({ value, label: optionLabel }) => [value, optionLabel]));
    return { valueByLabel: byLabel, labelByValue: byValue };
  }, [options]);

  const values = useMemo(
    () =>
      options.map(({ label: optionLabel, tooltip, count }) => ({
        label: optionLabel,
        count: count ?? 0,
        tooltip,
      })),
    [options]
  );

  // Only render counts once they are known for at least one option; otherwise every
  // value would misleadingly show 0 while the facet counts are still loading.
  const showCount = useMemo(
    () => options.some(({ count }) => typeof count === 'number'),
    [options]
  );

  const selectedLabels = selectedValues.map((value) => labelByValue.get(value) ?? value);

  return (
    <FieldValueSelection
      label={label}
      dataTestSubj={dataTestSubj}
      values={values}
      selectedValue={selectedLabels}
      query={query}
      setQuery={setQuery}
      singleSelection={singleSelection}
      asFilterButton
      showCount={showCount}
      allowExclusions={false}
      isDisabled={isDisabled}
      disabledTooltip={disabledTooltip}
      onChange={(selected = []) =>
        onChange(selected.map((selectedLabel) => valueByLabel.get(selectedLabel) ?? selectedLabel))
      }
    />
  );
};
