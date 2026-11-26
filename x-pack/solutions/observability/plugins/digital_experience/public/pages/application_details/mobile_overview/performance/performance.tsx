/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LoadErrorPrompt } from '../../../../components/load_error_prompt';
import { MOBILE_APPLICATION_EBT_ELEMENTS } from '../../../../ebt_constants';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { NO_APP_STARTS_DESCRIPTION } from '../app_start_labels';
import { AppStartChart } from './app_start_charts';
import type { MobileAppStartsState } from './use_mobile_app_starts';

const LOADING_HEIGHT = 240;

const TITLE = i18n.translate('xpack.digitalExperience.mobile.performance.title', {
  defaultMessage: 'Performance',
});

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.performance.loadError', {
  defaultMessage: 'Could not load the app starts',
});

const SectionBody = ({
  appStartsState: { appStarts, isLoading, error, refresh },
}: {
  appStartsState: MobileAppStartsState;
}): ReactNode => {
  const { setTimeRange } = useTimeRange();
  if (error) {
    return (
      <LoadErrorPrompt
        data-test-subj="digitalExperienceMobilePerformanceError"
        retryDataTestSubj="digitalExperienceMobilePerformanceRetry"
        retryEbtElement={MOBILE_APPLICATION_EBT_ELEMENTS.RETRY}
        title={LOAD_ERROR_TITLE}
        error={error}
        onRetry={refresh}
        headingLevel="h3"
      />
    );
  }
  if (isLoading || !appStarts) {
    return (
      <EuiFlexGroup
        css={{ blockSize: LOADING_HEIGHT }}
        alignItems="center"
        justifyContent="center"
        data-test-subj="digitalExperienceMobilePerformanceLoading"
      >
        <EuiLoadingChart size="l" />
      </EuiFlexGroup>
    );
  }
  if (appStarts.points.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="digitalExperienceMobilePerformanceEmpty">
        {NO_APP_STARTS_DESCRIPTION}
      </EuiText>
    );
  }
  return (
    <EuiFlexGrid columns={2} gutterSize="m">
      {(['cold', 'warm'] as const).map((type) => (
        <EuiFlexItem key={type}>
          <AppStartChart
            type={type}
            points={appStarts.points}
            histogram={appStarts.histogram}
            onTimeRangeSelect={setTimeRange}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};

/** The application's performance: its average cold and warm start over time. */
export function Performance({ appStartsState }: { appStartsState: MobileAppStartsState }) {
  const titleId = useGeneratedHtmlId({ prefix: 'performanceTitle' });

  return (
    <section aria-labelledby={titleId} data-test-subj="digitalExperienceMobilePerformance">
      <EuiTitle size="s">
        <h2 id={titleId}>{TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <SectionBody appStartsState={appStartsState} />
    </section>
  );
}
