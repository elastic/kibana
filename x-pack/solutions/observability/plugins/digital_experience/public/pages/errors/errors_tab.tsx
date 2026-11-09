/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { PAGE_FILTER_NAMES } from '../../../common/overview_filters';
import { ApplicationTabToolbar } from '../../components/application_tab_toolbar';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, ERRORS_EBT_ELEMENTS } from '../../ebt_constants';
import { useLastEnvironments } from '../../hooks/use_last_environments';
import { useOverviewFilters } from '../../hooks/use_overview_filters';
import { useOverviewKuery } from '../../hooks/use_overview_search';
import { OverviewFilterPills } from '../application_details/otel_overview/components/overview_filters';
import { JsErrorsPanel } from './components/js_errors_panel';
import { useApplicationErrors } from './hooks/use_application_errors';

/** Shown on the Errors tab and in place of the Overview's top errors. */
export const ERRORS_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.digitalExperience.errors.fetchErrorTitle',
  { defaultMessage: 'Could not load the errors' }
);

const kueryNote = (kuery: string) =>
  i18n.translate('xpack.digitalExperience.errors.kueryNote', {
    defaultMessage: "Narrowed by the Overview's KQL query: {kuery}",
    values: { kuery },
  });

const CLEAR_KUERY_LABEL = i18n.translate('xpack.digitalExperience.errors.clearKuery', {
  defaultMessage: 'Clear query',
});

/**
 * The JS errors of one EDOT Browser application, grouped, with their stack trace, narrowed by the
 * Overview's filters and KQL query in the URL, which show above the errors and can be removed.
 */
export function ErrorsTab({ serviceName }: { serviceName: string }) {
  const { response, isLoading, error, refresh } = useApplicationErrors(serviceName);
  const environments = useLastEnvironments(serviceName, response);
  const { filters, setFilter, setFilters } = useOverviewFilters();
  const { kuery, setKuery } = useOverviewKuery();
  // The page does not narrow the errors, so it is not shown as if it did.
  const errorFilters = omit(filters, PAGE_FILTER_NAMES);
  // Clears what shows here only: the page stays for the Overview, which shows it.
  const clearErrorFilters = () =>
    setFilters(Object.fromEntries(Object.keys(errorFilters).map((name) => [name, []])));

  return (
    <>
      <EuiSpacer size="m" />
      <ApplicationTabToolbar
        environments={environments}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      {Object.keys(errorFilters).length > 0 && (
        <>
          <EuiSpacer size="s" />
          <OverviewFilterPills
            filters={errorFilters}
            setFilter={setFilter}
            onClear={clearErrorFilters}
          />
        </>
      )}
      {kuery && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="digitalExperienceErrorsKuery">
                {kueryNote(kuery)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="cross"
                onClick={() => setKuery('')}
                data-test-subj="digitalExperienceErrorsKueryClear"
                {...getEbtProps({
                  action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CLEAR_FILTERS,
                  element: ERRORS_EBT_ELEMENTS.CLEAR_KUERY,
                })}
              >
                {CLEAR_KUERY_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="m" />
      {error ? (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceErrorsError"
          retryDataTestSubj="digitalExperienceErrorsRetry"
          retryEbtElement={ERRORS_EBT_ELEMENTS.RETRY}
          title={ERRORS_FETCH_ERROR_TITLE}
          error={error}
          onRetry={refresh}
        />
      ) : (
        <JsErrorsPanel
          errors={response?.errors ?? []}
          hasMoreErrors={response?.hasMoreErrors}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
