/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * This model deals with a cluster object from ES and converts it to Kibana downstream
 */
export class Cluster {
  public readonly uuid: string;

  constructor({ uuid }: { uuid: string }) {
    this.uuid = uuid;
  }

  public get downstreamJSON() {
    return {
      uuid: this.uuid,
    };
  }

  // generate Pipeline object from elasticsearch response
  static fromUpstreamJSON(upstreamCluster: estypes.InfoResponse) {
    const uuid = upstreamCluster.cluster_uuid;
    return new Cluster({ uuid });
  }
}
