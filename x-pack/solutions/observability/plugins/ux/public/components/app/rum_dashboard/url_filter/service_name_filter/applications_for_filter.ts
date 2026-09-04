/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RumApplicationOption } from '../../../../../../common/rum_platform';

/** Keep a URL-selected app in the picker even when the page-load terms agg omits it. */
export const applicationsForFilter = (
  applications: readonly RumApplicationOption[] | undefined,
  selectedServiceName: string | undefined
): RumApplicationOption[] => {
  const list = applications ? [...applications] : [];
  const selected = selectedServiceName?.trim();
  if (!selected || list.some((app) => app.name === selected)) {
    return list;
  }
  return [{ name: selected, platform: 'web' }, ...list];
};
