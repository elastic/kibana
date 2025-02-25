/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { useKibana } from './use_kibana';
import { i18n } from '@kbn/i18n';
import { IndexManagementBreadcrumbs } from '../components/shared/breadcrumbs';

export const usePageChrome = (docTitle: string, breadcrumbs: ChromeBreadcrumb[]) => {
  const { cloud, chrome, http, serverless} = useKibana().services;
  const IndexManagementBreadcrumb = IndexManagementBreadcrumbs();
  const newBreadcrumbs = [
    ...breadcrumbs,
    {
      text: docTitle,
    },
  ]

  useEffect(() => {
    chrome.docTitle.change(docTitle);
    // const newBreadcrumbs = breadcrumbs.map((breadcrumb) => {
    //   if (breadcrumb.href && http.basePath.get().length > 0) {
    //     breadcrumb.href = http.basePath.prepend(breadcrumb.href);
    //   }
    //   return breadcrumb;
    // });

    if (serverless) {
      serverless.setBreadcrumbs(newBreadcrumbs);
    } else {
      // chrome.setBreadcrumbs([{
      //   text: i18n.translate('xpack.searchIndices.breadcrumbs.indexManagement.label', {
      //     defaultMessage: 'Content',
      //   }),
      // }], {
      //   project: { value: newBreadcrumbs, absolute: true },
      // });
      const breadcrumbs = [{
        text: i18n.translate('xpack.searchIndices.breadcrumbs.indexManagement.label', {
          defaultMessage: 'Content',
        }),
      }, ...newBreadcrumbs]
      chrome.setBreadcrumbs(breadcrumbs, { project: { value: breadcrumbs, absolute: true }})
    }
    return () => {
      // clear manually set breadcrumbs
      if (serverless) {
        serverless.setBreadcrumbs([]);
      } else {
        chrome.setBreadcrumbs([]);
      }
    };
  }, [chrome, docTitle, http.basePath, serverless]);
};
