/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { useKibana } from './use_kibana';
import { PARENT_BREADCRUMB } from '../constants';

export const usePageChrome = (
  docTitle: string,
  breadcrumbs: ChromeBreadcrumb[],
  includeParentBreadcrumb: boolean = true
) => {
  const { chrome, serverless } = useKibana().services;

  useEffect(() => {
    chrome.docTitle.change(docTitle);

    if (serverless) {
      serverless.setBreadcrumbs(breadcrumbs);
    } else {
      const newBreadcrumbs = includeParentBreadcrumb
        ? [PARENT_BREADCRUMB, ...breadcrumbs]
        : breadcrumbs;
      chrome.setBreadcrumbs(newBreadcrumbs, { project: { value: newBreadcrumbs, absolute: true } });
    }
    return () => {
      // clear manually set breadcrumbs
      if (serverless) {
        serverless.setBreadcrumbs([]);
      } else {
        chrome.setBreadcrumbs([]);
      }
    };
  }, [chrome, docTitle, serverless, breadcrumbs, includeParentBreadcrumb]);
};
