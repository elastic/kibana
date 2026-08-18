/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { defineRoutes } from './routes';
import { PLUGIN_ID, PLUGIN_TITLE } from '../common';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class SearchQueryRulesPlugin extends Service {
  static readonly inject = ['core.logger', 'core.http', 'features.setup'];
  static readonly provide = 'searchQueryRules';

  constructor(ctx: Context) {
    super(ctx, 'searchQueryRules');
    const plugins = {
      features: (ctx.get('features.setup') as any).contract,
    };
    const router = (ctx.get('core.http') as any).createRouter();

        defineRoutes({ router, logger: (ctx.get('core.logger') as any).get('plugins', 'searchQueryRules') });

        plugins.features.registerKibanaFeature({
          id: PLUGIN_ID,
          name: PLUGIN_TITLE,
          order: 0,
          category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
          app: ['kibana', PLUGIN_ID],
          catalogue: [PLUGIN_ID],
          privileges: {
            all: {
              app: ['kibana', PLUGIN_ID],
              api: ['manage_search_query_rules'],
              catalogue: [PLUGIN_ID],
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['manage'],
            },
            read: {
              disabled: true,
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
          },
        });
  }
}
