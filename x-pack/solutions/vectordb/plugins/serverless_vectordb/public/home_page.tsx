/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ElasticsearchHomePageProps } from '@kbn/elasticsearch-home/public';
import { getVectordbHomeConfig } from './home_config';
import { useKibana } from './hooks/use_kibana';

const useVectordbHomeConfig = (): ElasticsearchHomePageProps => {
  const {
    services: { application, docLinks },
  } = useKibana();

  return useMemo(() => getVectordbHomeConfig({ application, docLinks }), [application, docLinks]);
};

export const HomePage = () => {
  const {
    services: { elasticsearchHome },
  } = useKibana();
  const config = useVectordbHomeConfig();

  const { HomePage: ElasticsearchHomePage } = elasticsearchHome;

  return <ElasticsearchHomePage {...config} />;
};

/** The shared home page and its onboarding wizards, rendered with integrated onboarding. */
export const IntegratedHomeApp = () => {
  const {
    services: { elasticsearchHome },
  } = useKibana();
  const config = useVectordbHomeConfig();

  const { HomeApp } = elasticsearchHome;

  return <HomeApp {...config} />;
};
