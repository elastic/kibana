/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { FilterChecked } from '@elastic/eui';
import { MultiselectFilter } from '../../../common/components/multiselect_filter';
import type { DriftCategory } from '../../../../common/endpoint_assets';
import * as i18n from '../../pages/translations';

const DRIFT_CATEGORIES: DriftCategory[] = [
  'privileges',
  'persistence',
  'network',
  'software',
  'posture',
];

interface DriftCategoryFilterProps {
  selectedCategories: DriftCategory[];
  onSelectionChange: (categories: DriftCategory[]) => void;
}

const getCategoryLabel = (category: DriftCategory): string => {
  switch (category) {
    case 'persistence':
      return i18n.DRIFT_CATEGORY_PERSISTENCE;
    case 'privileges':
      return i18n.DRIFT_CATEGORY_PRIVILEGES;
    case 'network':
      return i18n.DRIFT_CATEGORY_NETWORK;
    case 'software':
      return i18n.DRIFT_CATEGORY_SOFTWARE;
    case 'posture':
      return i18n.DRIFT_CATEGORY_POSTURE;
    default:
      return category;
  }
};

const DriftCategoryFilterComponent: React.FC<DriftCategoryFilterProps> = ({
  selectedCategories,
  onSelectionChange,
}) => {
  const handleChange = useCallback(
    (newSelection: DriftCategory[], _changedOption: DriftCategory, _changedStatus: FilterChecked) => {
      onSelectionChange(newSelection);
    },
    [onSelectionChange]
  );

  return (
    <MultiselectFilter<DriftCategory>
      data-test-subj="drift-category-filter"
      title={i18n.DRIFT_COLUMN_CATEGORY}
      items={DRIFT_CATEGORIES}
      selectedItems={selectedCategories}
      onSelectionChange={handleChange}
      renderItem={getCategoryLabel}
      renderLabel={getCategoryLabel}
      width={150}
    />
  );
};

export const DriftCategoryFilter = React.memo(DriftCategoryFilterComponent);
DriftCategoryFilter.displayName = 'DriftCategoryFilter';
