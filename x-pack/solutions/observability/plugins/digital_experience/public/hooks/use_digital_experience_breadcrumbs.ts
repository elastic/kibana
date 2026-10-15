/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import { useKibanaServices } from './use_kibana_services';
import type { TimeRange } from './use_time_range';
import { toTimeRangeSearch } from './use_time_range';

const DIGITAL_EXPERIENCE_LABEL = i18n.translate('xpack.digitalExperience.breadcrumbs.root', {
  defaultMessage: 'Digital Experience',
});

const APPLICATIONS_LABEL = i18n.translate('xpack.digitalExperience.breadcrumbs.applications', {
  defaultMessage: 'Applications',
});

const OVERVIEW_LABEL = i18n.translate('xpack.digitalExperience.breadcrumbs.overview', {
  defaultMessage: 'Overview',
});

/** Sets the breadcrumbs of the Applications list (no `serviceName`) or an Application view. */
export const useDigitalExperienceBreadcrumbs = ({
  serviceName,
  timeRange,
}: {
  serviceName?: string;
  timeRange: TimeRange;
}): void => {
  const { application } = useKibanaServices();
  const rootHref = application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
    path: `/${toTimeRangeSearch(timeRange)}`,
  });

  const breadcrumbs = useMemo<ChromeBreadcrumb[]>(
    () =>
      serviceName === undefined
        ? [{ text: DIGITAL_EXPERIENCE_LABEL }, { text: APPLICATIONS_LABEL }]
        : [
            { text: DIGITAL_EXPERIENCE_LABEL, href: rootHref },
            { text: APPLICATIONS_LABEL, href: rootHref },
            { text: serviceName },
            { text: OVERVIEW_LABEL },
          ],
    [serviceName, rootHref]
  );

  useBreadcrumbs(breadcrumbs);
};
