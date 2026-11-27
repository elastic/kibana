/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { START_TYPE_LIST } from '../../../../../common/mobile/app_starts';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { NO_APP_STARTS_DESCRIPTION } from '../app_start_labels';
import { MobileSection } from '../mobile_section';
import { AppStartChart } from './app_start_charts';
import type { MobileAppStartsState } from './use_mobile_app_starts';

const TITLE = i18n.translate('xpack.digitalExperience.mobile.performance.title', {
  defaultMessage: 'Performance',
});

const LOAD_ERROR_TITLE = i18n.translate('xpack.digitalExperience.mobile.performance.loadError', {
  defaultMessage: 'Could not load the app starts',
});

const LOADING_LABEL = i18n.translate('xpack.digitalExperience.mobile.performance.loading', {
  defaultMessage: 'Loading the app starts',
});

/** The application's performance: its average cold and warm start over time. */
export function Performance({
  appStartsState: { appStarts: response, ...state },
}: {
  appStartsState: MobileAppStartsState;
}) {
  const { setTimeRange } = useTimeRange();

  return (
    <MobileSection
      title={TITLE}
      state={{ response, ...state }}
      isEmpty={({ points }) => points.length === 0}
      emptyMessage={NO_APP_STARTS_DESCRIPTION}
      loadErrorTitle={LOAD_ERROR_TITLE}
      loadingLabel={LOADING_LABEL}
      data-test-subj="digitalExperienceMobilePerformance"
      testSubjPrefix="digitalExperienceMobilePerformance"
    >
      {({ points, histogram }) => (
        <EuiFlexGrid columns={2} gutterSize="m">
          {START_TYPE_LIST.map((type) => (
            <EuiFlexItem key={type}>
              <AppStartChart
                type={type}
                points={points}
                histogram={histogram}
                onTimeRangeSelect={setTimeRange}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      )}
    </MobileSection>
  );
}
