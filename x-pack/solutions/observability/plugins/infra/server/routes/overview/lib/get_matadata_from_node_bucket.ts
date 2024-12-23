/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeBucket } from './types';

interface Metadata {
  name: string | null;
  provider: string | null;
  platform: string | null;
}

export const getMetadataFromNodeBucket = (node: NodeBucket): Metadata => {
  const metadata = node.metadata.top[0];
  if (!metadata) {
    return { name: null, provider: null, platform: null };
  }
  return {
    name: metadata.metrics['host.name'] || null,
    provider: metadata.metrics['cloud.provider'] || null,
    platform: metadata.metrics['host.os.platform'] || null,
  };
};
