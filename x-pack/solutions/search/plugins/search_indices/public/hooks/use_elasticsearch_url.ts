/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

import { ELASTICSEARCH_URL_PLACEHOLDER } from '../constants';

export const useElasticsearchUrl = (): string => {
  const {
    services: { cloud },
  } = useKibana();

  const [elasticsearchUrl, setElasticsearchUrl] = useState<string>(ELASTICSEARCH_URL_PLACEHOLDER);

  useEffect(() => {
    cloud?.fetchElasticsearchConfig().then((config) => {
      setElasticsearchUrl(config?.elasticsearchUrl || ELASTICSEARCH_URL_PLACEHOLDER);
    });
  }, [cloud]);

  return elasticsearchUrl;
};
