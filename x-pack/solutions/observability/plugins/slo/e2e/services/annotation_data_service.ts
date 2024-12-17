/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '@kbn/ftr-common-functional-services';
import { KbnClient } from '@kbn/test';

export class AnnotationDataService {
  kibanaUrl: string;
  elasticsearchUrl: string;
  params: Record<string, any>;
  requester: KbnClient['requester'];
  getService: FtrProviderContext['getService'];

  constructor(params: Record<string, any>) {
    this.kibanaUrl = params.kibanaUrl;
    this.elasticsearchUrl = params.elasticsearchUrl;
    this.requester = params.getService('kibanaServer').requester;
    this.params = params;
    this.getService = params.getService;
  }

  async deleteAnnotationsIndex() {
    const esClient = this.getService('es');
    try {
      await esClient.indices.delete({
        index: 'observability-annotations',
        ignore_unavailable: true,
      });
      await esClient.indices.delete({
        index: 'observability-annotations',
        ignore_unavailable: true,
      });
    } catch (e) {
      // ignore
    }
  }
}
