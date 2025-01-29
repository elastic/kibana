/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { ES_SEARCH_PLAYGROUND_ID } from '@kbn/deeplinks-search';

import { useKibana } from '@kbn/kibana-react-plugin/public';

export const PlaygroundRedirect: React.FC = () => {
  const { application } = useKibana().services;

  useEffect(() => {
    application?.navigateToApp(ES_SEARCH_PLAYGROUND_ID);
  }, [application]);

  return null;
};
