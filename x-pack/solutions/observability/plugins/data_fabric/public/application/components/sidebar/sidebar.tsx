/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldSearch,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { ActiveFilters } from '../../data_fabric_app';
import type { FilterOption } from '../../mock_data';
import { FilterSection } from './filter_section';

interface SidebarProps {
  filters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  shipperTypeOptions: FilterOption[];
  policyOptions: FilterOption[];
  streamTypeOptions: FilterOption[];
  destinationOptions: FilterOption[];
}

export const Sidebar = ({
  filters,
  onChange,
  shipperTypeOptions,
  policyOptions,
  streamTypeOptions,
  destinationOptions,
}: SidebarProps) => {
  return (
    <>
      <EuiFieldSearch
        placeholder="Search"
        compressed
        fullWidth
        aria-label="Search filters"
      />
      <EuiHorizontalRule margin="s" />

      <FilterSection
        title="Shipper types"
        options={shipperTypeOptions}
        selected={filters.shipperTypes}
        onChange={(shipperTypes) => onChange({ ...filters, shipperTypes })}
      />
      <EuiHorizontalRule margin="s" />

      <FilterSection
        title="Policies"
        options={policyOptions}
        selected={filters.policies}
        onChange={(policies) => onChange({ ...filters, policies })}
      />
      <EuiHorizontalRule margin="s" />

      <FilterSection
        title="Stream types"
        options={streamTypeOptions}
        selected={filters.streamTypes}
        onChange={(streamTypes) => onChange({ ...filters, streamTypes })}
      />
      <EuiHorizontalRule margin="s" />

      <FilterSection
        title="Destinations"
        options={destinationOptions}
        selected={filters.destinations}
        onChange={(destinations) => onChange({ ...filters, destinations })}
      />
    </>
  );
};
