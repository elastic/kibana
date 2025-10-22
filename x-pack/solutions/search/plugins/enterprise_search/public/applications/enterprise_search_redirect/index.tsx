/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { SEARCH_HOMEPAGE } from '@kbn/deeplinks-search';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Routes, Route } from '@kbn/shared-ux-router';

const DEPRECATED_PATHS = [
  '/app/enterprise_search/ai_search',
  '/app/enterprise_search/elasticsearch',
  '/app/enterprise_search/vector_search',
  '/app/enterprise_search/semantic_search',
];

const RedirectWithReplace = () => {
  const { application } = useKibana().services;

  useEffect(() => {
    const fullPath = location.pathname;
    if (DEPRECATED_PATHS.some((path) => fullPath.includes(path))) {
      application?.navigateToApp(SEARCH_HOMEPAGE);
      return;
    }

    // Construct the new path by replacing 'enterprise_search' with 'elasticsearch'
    const newPath = fullPath.replace('/enterprise_search', '/elasticsearch');

    // Perform the client-side navigation using core
    application?.navigateToUrl(newPath);
  }, []);

  return null;
};

export const ApplicationRedirect = () => {
  return (
    <Routes>
      <Route path="/*" component={RedirectWithReplace} />
    </Routes>
  );
};
