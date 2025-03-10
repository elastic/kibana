/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { FilterOptions } from '../types';
import { MultiSelectFilter, MultiSelectFilterOption } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  optionKeys: ServiceProviderKeys[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
}

const options = Object.entries(SERVICE_PROVIDERS).map(([key, { name }]) => ({
  key,
  label: name,
}));

export const ServiceProviderFilter: React.FC<Props> = ({ optionKeys, onChange }) => {
  const filterId: string = 'provider';
  const onSystemFilterChange = (newOptions: MultiSelectFilterOption[]) => {
    onChange({
      [filterId]: newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key),
    });
  };

  return (
    <MultiSelectFilter
      buttonLabel={i18n.SERVICE_PROVIDER}
      onChange={onSystemFilterChange}
      options={options}
      renderOption={(option) => option.label}
      selectedOptionKeys={optionKeys}
      dataTestSubj="service-field-endpoints"
    />
  );
};
