/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderTab } from '@kbn/app-header';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { useEnabledProfilingStatus } from '../../components/contexts/profiling_status/use_enabled_profiling_status';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { hasUsableProfilingData } from '../../utils/has_usable_profiling_data';
import { OtelAddDataInstructions } from './otel/otel_add_data_instructions';
import { UniversalProfilingAddData } from './universal_profiling/universal_profiling_add_data';

export const OTEL_TAB_LABEL = i18n.translate('xpack.profiling.addDataView.otelTabLabel', {
  defaultMessage: 'Profiling',
});

export const UNIVERSAL_PROFILING_TAB_LABEL = i18n.translate(
  'xpack.profiling.addDataView.universalProfilingTabLabel',
  { defaultMessage: 'Universal Profiling (legacy)' }
);

export function AddDataView() {
  const { data: profilingStatus } = useEnabledProfilingStatus();
  const { query } = useProfilingParams('/add-data-instructions');
  const router = useProfilingRouter();
  const { universalProfiling } = profilingStatus;

  const selectedSchema =
    query.schema === ProfilingSchema.ECS && universalProfiling.isAvailable
      ? ProfilingSchema.ECS
      : ProfilingSchema.OTEL;

  // Don't even render tabs if Universal Profiling is not available
  const tabs: AppHeaderTab[] = universalProfiling.isAvailable
    ? [
        {
          id: ProfilingSchema.OTEL,
          label: OTEL_TAB_LABEL,
          isSelected: selectedSchema === ProfilingSchema.OTEL,
          href: router.link('/add-data-instructions', {
            query: { schema: ProfilingSchema.OTEL },
          }),
        },
        {
          id: ProfilingSchema.ECS,
          label: UNIVERSAL_PROFILING_TAB_LABEL,
          isSelected: selectedSchema === ProfilingSchema.ECS,
          // Keeps the selected sub-tab when clicking the already selected tab
          href: router.link('/add-data-instructions', {
            query: { schema: ProfilingSchema.ECS, selectedTab: query.selectedTab },
          }),
        },
      ]
    : [];

  return (
    <ProfilingAppPageTemplate
      restrictWidth
      hideSearchBar
      pageTitle={i18n.translate('xpack.profiling.noDataPage.pageTitle', {
        defaultMessage: 'Add profiling data',
      })}
      tabs={tabs}
      suppressMenu={!hasUsableProfilingData(profilingStatus) || universalProfiling.hasLegacyData}
    >
      {selectedSchema === ProfilingSchema.ECS ? (
        <UniversalProfilingAddData />
      ) : (
        <OtelAddDataInstructions />
      )}
    </ProfilingAppPageTemplate>
  );
}
