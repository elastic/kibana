/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { FilterOptions } from '../types';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  optionKeys: ServiceProviderKeys[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
  uniqueProviders: Set<ServiceProviderKeys>;
}

export const ServiceProviderFilter: React.FC<Props> = ({
  optionKeys,
  onChange,
  uniqueProviders,
}) => {
  const filterId: string = 'provider';
  const onSystemFilterChange = (newOptions: MultiSelectFilterOption[]) => {
    onChange({
      [filterId]: newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key),
    });
  };

  const filteredOptions = useMemo<MultiSelectFilterOption[]>(() => {
    return Array.from(uniqueProviders).map((provider) => ({
      key: provider,
      label: SERVICE_PROVIDERS[provider]?.name ?? provider,
    }));
  }, [uniqueProviders]);

  return (
    <MultiSelectFilter
      buttonLabel={i18n.SERVICE_PROVIDER}
      onChange={onSystemFilterChange}
      options={filteredOptions}
      renderOption={(option) => option.label}
      selectedOptionKeys={optionKeys}
      dataTestSubj="service-field-endpoints"
    />
  );
};
