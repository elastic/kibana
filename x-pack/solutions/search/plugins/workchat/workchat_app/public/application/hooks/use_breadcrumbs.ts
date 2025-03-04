/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { useKibana } from './use_kibana';

export const useBreadcrumb = (breadcrumb: ChromeBreadcrumb[]) => {
  const {
    services: { chrome },
  } = useKibana();

  useEffect(() => {
    chrome.setBreadcrumbs(breadcrumb);
    return () => {
      chrome.setBreadcrumbs([]);
    };
  }, [chrome, breadcrumb]);
};
