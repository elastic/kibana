/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { PND_PLUGIN_NAME } from '@kbn/pnd-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const usePndDocTitle = (pageTitle: string): void => {
  const { services } = useKibana();

  useEffect(() => {
    services.chrome?.docTitle.change(`${pageTitle} - ${PND_PLUGIN_NAME}`);
    return () => {
      services.chrome?.docTitle.reset();
    };
  }, [pageTitle, services.chrome]);
};
