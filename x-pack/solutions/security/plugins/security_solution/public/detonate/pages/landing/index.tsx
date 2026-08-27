/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { DETONATE_TABLE_LIMIT, isProtectionEventCode } from '../../../../common/detonate';
import { SecurityPageName } from '../../../../common/constants';
import { HeaderPage } from '../../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { DetonationFiltersBar } from '../../components/detonation_filters_bar';
import { DetonationKpis } from '../../components/detonation_kpis';
import { DetonationsTable } from '../../components/detonations_table';
import { PlatformChart } from '../../components/platform_chart';
import { ProtectionsChart } from '../../components/protections_chart';
import { ResearchFeedPanel } from '../../components/research_feed_panel';
import { SubmitSamplePanel } from '../../components/submit_sample_panel';
import { TopFamiliesChart } from '../../components/top_families_chart';
import {
  useDetonationKpis,
  useDetonationQuery,
  useDetonations,
  usePlatformBreakdown,
  useProtectionBreakdown,
  useSourceBreakdown,
} from '../../hooks/use_detonations';
import type { DetonationFilters } from '../../transforms';
import { EMPTY_DETONATION_FILTERS } from '../../transforms';
import {
  DETONATE,
  DETONATE_SUBTITLE,
  FILTERED_ROW_COUNT,
  LOAD_ERROR,
  LOAD_ERROR_BODY,
  ROW_CAP_NOTICE,
  TABLE_TITLE,
} from '../../translations';

/**
 * Detonation data spans months, and alerts far outlive the default 24-hour window, so the page
 * opens on a range wide enough to show results rather than an empty table.
 */
const DEFAULT_TIME_RANGE = { from: 'now-90d', to: 'now' };

const toggleValue = (values: string[], value: string): string[] =>
  values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

export const DetonateLandingPage = React.memo(function DetonateLandingPage() {
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE);
  const [filters, setFilters] = useState<DetonationFilters>(EMPTY_DETONATION_FILTERS);

  const onTimeChange = useCallback(({ start, end }: OnTimeChangeProps) => {
    setTimeRange({ from: start, to: end });
  }, []);

  const onFiltersChange = useCallback(
    (next: Partial<DetonationFilters>) => setFilters((current) => ({ ...current, ...next })),
    []
  );

  const onFiltersReset = useCallback(() => setFilters(EMPTY_DETONATION_FILTERS), []);

  const onToggleFamily = useCallback(
    (family: string) =>
      setFilters((current) => ({ ...current, families: toggleValue(current.families, family) })),
    []
  );

  const onToggleProtection = useCallback(
    (protection: string) =>
      setFilters((current) => ({
        ...current,
        protections: toggleValue(current.protections, protection).filter(isProtectionEventCode),
      })),
    []
  );

  const onTogglePlatform = useCallback(
    (platform: string) =>
      setFilters((current) => ({
        ...current,
        platforms: toggleValue(current.platforms, platform),
      })),
    []
  );

  const { queryArgs, families, familyNames, isLoadingFamilies } = useDetonationQuery({
    timeRange,
    filters,
  });

  const { detonations, isLoading, isError, refetch } = useDetonations(queryArgs);

  const { protections, isLoading: isLoadingProtections } = useProtectionBreakdown(queryArgs);
  const { platforms, isLoading: isLoadingPlatforms } = usePlatformBreakdown(queryArgs);
  const { sources } = useSourceBreakdown(queryArgs);

  const { kpis, isLoading: isLoadingKpis } = useDetonationKpis({ timeRange });

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const protectionOptions = useMemo(() => protections.map(({ key }) => key), [protections]);
  const platformOptions = useMemo(() => platforms.map(({ key }) => key), [platforms]);
  const sourceOptions = useMemo(() => sources.map(({ key }) => key), [sources]);

  return (
    <SecuritySolutionPageWrapper data-test-subj="detonatePage">
      <HeaderPage
        title={DETONATE}
        subtitle={DETONATE_SUBTITLE}
        rightSideItems={[
          <EuiSuperDatePicker
            key="detonateDatePicker"
            start={timeRange.from}
            end={timeRange.to}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
            showUpdateButton
            width="auto"
          />,
        ]}
      />

      {isError ? (
        <EuiCallOut announceOnMount title={LOAD_ERROR} color="danger" iconType="error">
          <p>{LOAD_ERROR_BODY}</p>
        </EuiCallOut>
      ) : (
        <>
          <DetonationKpis kpis={kpis} isLoading={isLoadingKpis} />
          <EuiSpacer size="l" />

          <DetonationFiltersBar
            filters={filters}
            onChange={onFiltersChange}
            onReset={onFiltersReset}
            familyOptions={familyNames}
            protectionOptions={protectionOptions}
            platformOptions={platformOptions}
            sourceOptions={sourceOptions}
          />

          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={2}>
              <TopFamiliesChart
                families={families}
                isLoading={isLoadingFamilies}
                selected={filters.families}
                onToggle={onToggleFamily}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFlexGroup direction="column" gutterSize="l">
                <EuiFlexItem grow={false}>
                  <SubmitSamplePanel />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ResearchFeedPanel />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={1}>
              <ProtectionsChart
                protections={protections}
                isLoading={isLoadingProtections}
                selected={filters.protections}
                onToggle={onToggleProtection}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <PlatformChart
                platforms={platforms}
                isLoading={isLoadingPlatforms}
                selected={filters.platforms}
                onToggle={onTogglePlatform}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>{TABLE_TITLE}</h3>
            </EuiTitle>

            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {FILTERED_ROW_COUNT(detonations.length)}
              {detonations.length === DETONATE_TABLE_LIMIT
                ? ` — ${ROW_CAP_NOTICE(DETONATE_TABLE_LIMIT)}`
                : ''}
            </EuiText>
            <EuiSpacer size="s" />

            <DetonationsTable detonations={detonations} isLoading={isLoading} />
          </EuiPanel>
        </>
      )}

      <SpyRoute pageName={SecurityPageName.detonate} />
    </SecuritySolutionPageWrapper>
  );
});
