/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../kibana';

export interface CloudDetails {
  cloudId: string | undefined;
  deploymentUrl: string | undefined;
  elasticsearchUrl: string | undefined;
  kibanaUrl: string | undefined;
}

export const useCloudDetails = (): CloudDetails => {
  const { cloud } = useValues(KibanaLogic);
  const [elasticsearchUrl, setElasticsearchUrl] = useState<string | undefined>('');

  useEffect(() => {
    cloud?.fetchElasticsearchConfig().then((config) => {
      setElasticsearchUrl(config.elasticsearchUrl);
    });
  }, [cloud]);

  return {
    cloudId: cloud?.cloudId,
    deploymentUrl: cloud?.deploymentUrl,
    elasticsearchUrl,
    kibanaUrl: cloud?.kibanaUrl,
  };
};
