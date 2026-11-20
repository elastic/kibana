/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-shared-ui';
import { useKibana } from '../../hooks/use_kibana';

/** The deployment's Elasticsearch endpoint, or a placeholder where it is not known. */
export const useElasticsearchUrl = (): string => {
  const { cloud } = useKibana().services;
  const [elasticsearchUrl, setElasticsearchUrl] = useState<string>(ELASTICSEARCH_URL_PLACEHOLDER);

  useEffect(() => {
    let isCurrent = true;
    cloud
      ?.fetchElasticsearchConfig()
      .then((config) => {
        if (isCurrent && config?.elasticsearchUrl) {
          setElasticsearchUrl(config.elasticsearchUrl);
        }
      })
      // The placeholder stays when the endpoint cannot be read.
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [cloud]);

  return elasticsearchUrl;
};
