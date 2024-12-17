/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBreadcrumb } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { ThemedBreadcrumbs } from './styles';
import { useColors } from '../use_colors';

/**
 * Breadcrumb menu
 */
// eslint-disable-next-line react/display-name
export const Breadcrumbs = memo(function ({ breadcrumbs }: { breadcrumbs: EuiBreadcrumb[] }) {
  // Just tagging the last crumb with `data-test-subj` for testing
  const crumbsWithLastSubject: EuiBreadcrumb[] = useMemo(() => {
    const lastcrumb = breadcrumbs.slice(-1).map((crumb) => {
      crumb['data-test-subj'] = 'resolver:breadcrumbs:last';
      // Manually set here as setting truncate={true} on ThemedBreadcrumbs truncates all parts of the full path
      crumb.truncate = true;
      return crumb;
    });
    return [...breadcrumbs.slice(0, -1), ...lastcrumb];
  }, [breadcrumbs]);

  const { resolverBreadcrumbBackground, resolverEdgeText } = useColors();
  return (
    <>
      <ThemedBreadcrumbs
        background={resolverBreadcrumbBackground}
        text={resolverEdgeText}
        breadcrumbs={crumbsWithLastSubject}
        truncate={false}
      />
    </>
  );
});
