/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

export function useFlowBreadcrumb(breadcrumb: ChromeBreadcrumb | null) {
  useBreadcrumbs(breadcrumb !== null ? [breadcrumb] : [], {
    app: {
      id: 'observabilityOnboarding',
      label: i18n.translate(
        'xpack.observability_onboarding.otelKubernetesPanel.breadcrumbs.addDataLabel',
        { defaultMessage: 'Add Data' }
      ),
    },
    absoluteProjectStyleBreadcrumbs: false,
  });
}
