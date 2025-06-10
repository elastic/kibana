/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';

export const handleSelectOptions =
  (
    currentSelectedIndices: string[],
    setSelectedTempIndices: React.Dispatch<React.SetStateAction<string[]>>
  ) =>
  (options: EuiSelectableOption[]): void => {
    const accumulator: {
      selectedIndices: string[];
      unselectedIndices: string[];
    } = { selectedIndices: [], unselectedIndices: [] };
    const { selectedIndices, unselectedIndices } = options.reduce((acc, option) => {
      const indexName = option.label;
      if (option.checked === 'on') {
        acc.selectedIndices.push(indexName);
      } else if (currentSelectedIndices.includes(indexName)) {
        acc.unselectedIndices.push(indexName);
      }
      return acc;
    }, accumulator);
    const filteredSelectedIndices = currentSelectedIndices.filter(
      (index) => !unselectedIndices.includes(index)
    );

    const updatedSelectedIndices: string[] = Array.from(
      new Set([...filteredSelectedIndices, ...selectedIndices])
    );
    setSelectedTempIndices(updatedSelectedIndices);
  };
