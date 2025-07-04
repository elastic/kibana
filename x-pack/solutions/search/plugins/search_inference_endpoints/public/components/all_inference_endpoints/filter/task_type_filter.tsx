/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { FilterOptions } from '../types';
import { MultiSelectFilter, MultiSelectFilterOption } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  optionKeys: InferenceTaskType[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
  uniqueTaskTypes: Set<InferenceTaskType>;
}

export const TaskTypeFilter: React.FC<Props> = ({ optionKeys, onChange, uniqueTaskTypes }) => {
  const filterId: string = 'type';
  const onSystemFilterChange = (newOptions: MultiSelectFilterOption[]) => {
    onChange({
      [filterId]: newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key),
    });
  };

  const filteredOptions = useMemo(() => {
    return [...uniqueTaskTypes].map((type) => ({
      key: type,
      label: type,
    }));
  }, [uniqueTaskTypes]);

  return (
    <MultiSelectFilter
      buttonLabel={i18n.TASK_TYPE}
      onChange={onSystemFilterChange}
      options={filteredOptions}
      renderOption={(option) => option.label}
      selectedOptionKeys={optionKeys}
      dataTestSubj="type-field-endpoints"
    />
  );
};
