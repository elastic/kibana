/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

export const usePageChrome = (docTitle: string, breadcrumbs: ChromeBreadcrumb[]) => {
  const { chrome, serverless } = useKibana().services;

  useEffect(() => {
    chrome.docTitle.change(docTitle);

    if (serverless) {
      serverless.setBreadcrumbs(breadcrumbs);
    } else {
      const newBreadcrumbs = [
        {
          text: i18n.translate('xpack.searchIndices.breadcrumbs.data.label', {
            defaultMessage: 'Data',
          }),
        },
        ...breadcrumbs,
      ];
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
  }, [chrome, docTitle, serverless, breadcrumbs]);
};
