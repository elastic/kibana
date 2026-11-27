/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy, useMemo } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { encode } from '@kbn/rison';
import type { CoreStart } from '@kbn/core/public';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import {
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_BASE_PATH,
} from '@kbn/deeplinks-observability';
import { useHasData } from '../../../../../hooks/use_has_data';
import { useDatePickerContext } from '../../../../../hooks/use_date_picker_context';
import { useKibana } from '../../../../../utils/kibana_react';
import { SectionContainer } from '../section_container';
import { paths } from '../../../../../../common/locators/paths';
import type { BucketSize } from '../../../helpers/calculate_bucket_size';
import { ClassicAlertsSection } from './classic_alerts_section';

const UniversalAlertsSection = lazy(() => import('./universal_alerts_section'));

const SECTION_TITLE = i18n.translate('xpack.observability.overview.alerts.title', {
  defaultMessage: 'Alerts',
});

const SECTION_APP_LINK_LABEL = i18n.translate('xpack.observability.overview.alerts.appLink', {
  defaultMessage: 'Show alerts',
});

export function AlertsSection({ bucketSize }: { bucketSize: BucketSize }) {
  const services = useKibana().services;
  const { hasDataMap } = useHasData();
  const { relativeStart, relativeEnd } = useDatePickerContext();

  const alertingVTwo = services.alertingVTwo;
  const showUniversal =
    !!services.settings && isAlertingV2Enabled(services as CoreStart) && alertingVTwo != null;

  const hasAlertingRules = !!hasDataMap.alert?.hasData;

  const appLinkHref = useMemo(() => {
    if (!showUniversal) {
      return paths.observability.alerts;
    }
    const appState = encode({ alertsList: { timeFrom: relativeStart, timeTo: relativeEnd } });
    return `${OBSERVABILITY_ALERTING_BASE_PATH}${OBSERVABILITY_ALERTING_ALERTS_PATH}?_a=${appState}`;
  }, [showUniversal, relativeStart, relativeEnd]);

  if (!hasAlertingRules) {
    return null;
  }

  return (
    <SectionContainer
      title={SECTION_TITLE}
      data-test-subj="obltOverviewAlerts"
      appLink={{ href: appLinkHref, label: SECTION_APP_LINK_LABEL }}
      hasError={false}
      hasInnerPanel={!showUniversal}
    >
      {showUniversal ? (
        <Suspense fallback={<EuiLoadingSpinner data-test-subj="obltOverviewAlertsLoading" />}>
          <UniversalAlertsSection alertingVTwo={alertingVTwo} />
        </Suspense>
      ) : (
        <ClassicAlertsSection bucketSize={bucketSize} />
      )}
    </SectionContainer>
  );
}
