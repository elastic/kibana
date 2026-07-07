/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

// Accept primitives instead of a ChromeBreadcrumb object so the memoized
// crumb array stays referentially stable across renders. With an object
// argument, callers create a fresh one each render and the underlying
// setBreadcrumbs effect re-fires every render, which makes the parent's
// empty-default call briefly clobber the child's crumb during URL changes
// (e.g. the ingestion mode toggle).
export function useFlowBreadcrumb(text: string | null, href?: string) {
  const extraCrumbs = useMemo<ChromeBreadcrumb[]>(
    () => (text !== null ? [{ text, href }] : []),
    [text, href]
  );

  useBreadcrumbs(extraCrumbs, {
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
