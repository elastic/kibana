/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { getVectordbHomeConfig } from './home_config';
import { useKibana } from './hooks/use_kibana';

export const HomePage = () => {
  const {
    services: { application, docLinks, elasticsearchHome },
  } = useKibana();

  const { HomePage: ElasticsearchHomePage } = elasticsearchHome;

  const config = useMemo(
    () => getVectordbHomeConfig({ application, docLinks }),
    [application, docLinks]
  );

  return <ElasticsearchHomePage {...config} />;
};
