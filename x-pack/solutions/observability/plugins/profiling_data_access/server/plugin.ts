/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';


// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class ProfilingDataAccessPlugin extends Service {
  static readonly inject: string[] = [];
  static readonly provide = 'profilingDataAccess';

  constructor(ctx: Context) {
    super(ctx, 'profilingDataAccess');

    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     const config = this.initializerContext.config.get();
    // 
    //     const profilingSpecificEsClient = config.elasticsearch
    //       ? core.elasticsearch.createClient('profiling', {
    //           hosts: [config.elasticsearch.hosts],
    //           username: config.elasticsearch.username,
    //           password: config.elasticsearch.password,
    //         })
    //       : undefined;
    // 
    //     const services = registerServices({
    //       createProfilingEsClient: ({ esClient: defaultEsClient, useDefaultAuth = false }) => {
    //         const esClient =
    //           profilingSpecificEsClient && !useDefaultAuth
    //             ? profilingSpecificEsClient.asInternalUser
    //             : defaultEsClient;
    // 
    //         return createProfilingEsClient({ esClient });
    //       },
    //       logger: this.logger,
    //       deps: {
    //         fleet: plugins.fleet,
    //         cloud: plugins.cloud,
    //       },
    //     });
    // 
    //     // called after all plugins are set up
    //     return {
    //       services,
    //     };
    //   }
  }
}
