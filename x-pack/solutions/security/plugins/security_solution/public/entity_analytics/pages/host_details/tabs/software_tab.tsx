/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch, EuiToolTip, EuiPanel } from '@elastic/eui';
import { SoftwareSummaryCards } from '../../../../endpoint_assets/components/software_summary_cards';
import { SoftwareTable } from '../../../../endpoint_assets/components/software_table';
import { useSoftwareInventory } from '../../../../endpoint_assets/hooks/use_software_inventory';
import type { SoftwareType } from '../../../../common/endpoint_assets';

const CURRENT_ONLY_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTab.currentOnlyLabel',
  { defaultMessage: 'Current only' }
);

const CURRENT_ONLY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareTab.currentOnlyTooltip',
  {
    defaultMessage:
      'When enabled, shows only software confirmed as installed within the last 48 hours. When disabled, shows all software ever detected (including potentially uninstalled).',
  }
);

// Default max stale hours for "current only" view - should be slightly longer than osquery pack frequency
const DEFAULT_MAX_STALE_HOURS = 48;

interface SoftwareTabProps {
  hostId: string;
  installedCount?: number;
  servicesCount?: number;
}

export const SoftwareTab: React.FC<SoftwareTabProps> = React.memo(
  ({ hostId, installedCount, servicesCount }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [sortField, setSortField] = useState<'name' | 'version' | 'lastSeen'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [typeFilter, setTypeFilter] = useState<SoftwareType | 'all'>('all');
    const [currentOnly, setCurrentOnly] = useState(true);

    const maxStaleHours = currentOnly ? DEFAULT_MAX_STALE_HOURS : undefined;

    const { data, loading, error, refresh } = useSoftwareInventory({
      hostId,
      search: searchTerm,
      type: typeFilter,
      page,
      perPage: 25,
      sortField,
      sortDirection,
      maxStaleHours,
    });

    const handleCurrentOnlyToggle = useCallback(() => {
      setCurrentOnly((prev) => !prev);
      setPage(0);
    }, []);

    const handleSearchChange = useCallback((term: string) => {
      setSearchTerm(term);
      setPage(0);
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
      setPage(newPage);
    }, []);

    const handleSortChange = useCallback(
      (field: 'name' | 'version' | 'lastSeen', direction: 'asc' | 'desc') => {
        setSortField(field);
        setSortDirection(direction);
        setPage(0);
      },
      []
    );

    const handleTypeFilterChange = useCallback((newType: SoftwareType | 'all') => {
      setTypeFilter(newType);
      setPage(0);
    }, []);

    return (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiSpacer size="l" />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <SoftwareSummaryCards
                installedCount={installedCount}
                servicesCount={servicesCount}
                typeFilter={typeFilter}
                onTypeFilterChange={handleTypeFilterChange}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPanel hasBorder paddingSize="s">
                <EuiToolTip content={CURRENT_ONLY_TOOLTIP} position="top">
                  <EuiSwitch
                    label={CURRENT_ONLY_LABEL}
                    checked={currentOnly}
                    onChange={handleCurrentOnlyToggle}
                    compressed
                  />
                </EuiToolTip>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="l" />
          <SoftwareTable
            items={data?.items ?? []}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            page={page}
            onPageChange={handlePageChange}
            total={data?.total ?? 0}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            hostName={data?.hostName ?? ''}
            onRefresh={refresh}
            typeFilter={typeFilter}
            onTypeFilterChange={handleTypeFilterChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

SoftwareTab.displayName = 'SoftwareTab';
