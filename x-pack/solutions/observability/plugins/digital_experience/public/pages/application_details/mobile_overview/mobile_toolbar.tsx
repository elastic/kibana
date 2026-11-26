/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { ApplicationTabToolbar } from '../../../components/application_tab_toolbar';
import { FacetFilter } from '../../../components/facet_filter';
import {
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
  MOBILE_APPLICATION_EBT_ELEMENTS,
} from '../../../ebt_constants';
import { useEnvironment } from '../../../hooks/use_environment';
import { useFormatters } from '../../../hooks/use_formatters';
import { useQueryParam } from '../../../hooks/use_query_param';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import type { FacetBucket } from '../../../../common/sessions';
import type { MobileKpisResponse } from '../../../../common/types/mobile';

const OS_LABEL = i18n.translate('xpack.digitalExperience.mobile.filter.os', {
  defaultMessage: 'OS',
});

const RELEASE_LABEL = i18n.translate('xpack.digitalExperience.mobile.filter.release', {
  defaultMessage: 'Release',
});

const ClearFiltersButton = ({ onClear }: { onClear: () => void }) => (
  <EuiButton
    data-test-subj="digitalExperienceMobileClearFilters"
    {...getEbtProps({
      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
      element: MOBILE_APPLICATION_EBT_ELEMENTS.CLEAR_FILTERS,
    })}
    onClick={onClear}
  >
    {i18n.translate('xpack.digitalExperience.mobile.clearFilters', {
      defaultMessage: 'Clear filters',
    })}
  </EuiButton>
);

/** Whether a mobile tab is filtered, and the button that clears its filters when it is. */
export const useMobileFilters = (): { isFiltered: boolean; clearFiltersButton?: ReactNode } => {
  const { environment } = useEnvironment();
  const { value: release } = useQueryParam('release');
  const { value: osName } = useQueryParam('osName');
  const updateUrlQuery = useUpdateUrlQuery();
  const isFiltered = environment !== undefined || osName !== undefined || release !== undefined;
  // One history entry, so Back restores every filter at once.
  const clearFilters = () =>
    updateUrlQuery({ environment: undefined, osName: undefined, release: undefined });
  return {
    isFiltered,
    clearFiltersButton: isFiltered ? <ClearFiltersButton onClear={clearFilters} /> : undefined,
  };
};

/**
 * The toolbar every mobile tab shares: the environment, OS and release filters, kept in the URL so
 * a reload or a shared link keeps them, and the date picker. The options come from the KPIs,
 * unless a tab gives its own releases.
 */
export function MobileToolbar({
  kpis,
  releases,
  isLoading,
  onRefresh,
}: {
  kpis: MobileKpisResponse | undefined;
  /** The releases to pick from instead of the KPIs': the Crashes tab's, the releases that crashed. */
  releases?: FacetBucket[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const releaseBuckets = releases ?? kpis?.releases;
  const formatters = useFormatters();
  const { value: release, setValue: setRelease } = useQueryParam('release');
  const { value: osName, setValue: setOsName } = useQueryParam('osName');

  return (
    // The filters keep their width when one is picked, and the date picker its place, so the page
    // doesn't move.
    <ApplicationTabToolbar
      environments={kpis?.environments}
      isLoading={isLoading}
      onRefresh={onRefresh}
      filters={
        <>
          <FacetFilter
            data-test-subj="digitalExperienceMobileOsFilter"
            ebtElement={MOBILE_APPLICATION_EBT_ELEMENTS.OS_FILTER}
            label={OS_LABEL}
            buckets={kpis?.osNames ?? []}
            selected={osName}
            onChange={setOsName}
            formatters={formatters}
            isLoading={isLoading && !kpis}
          />
          <FacetFilter
            data-test-subj="digitalExperienceMobileReleaseFilter"
            ebtElement={MOBILE_APPLICATION_EBT_ELEMENTS.RELEASE_FILTER}
            label={RELEASE_LABEL}
            buckets={releaseBuckets ?? []}
            selected={release}
            onChange={setRelease}
            formatters={formatters}
            isLoading={isLoading && !releaseBuckets}
          />
        </>
      }
    />
  );
}
