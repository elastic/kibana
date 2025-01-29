/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../hooks/use_kibana';

const LICENSE_MANAGEMENT_LOCATOR = 'LICENSE_MANAGEMENT_LOCATOR';

/**
 * Hook to get the license management locator
 * @returns a callback to navigate to the license management page
 */
export const useLicenseManagementLocatorApi = () => {
  const { share } = useKibana().services;

  const locator = share.url.locators.get(LICENSE_MANAGEMENT_LOCATOR);

  // license management does not exist on serverless
  if (!locator) return;

  return () => locator.navigate({ page: 'dashboard' });
};
