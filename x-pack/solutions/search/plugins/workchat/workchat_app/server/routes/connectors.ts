/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListConnectorsResponse } from '../../common/http_api/connectors';
import type { RouteDependencies } from './types';
import { getConnectorList } from '../utils';

export const registerConnectorRoutes = ({ getServices, router, core }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/workchat/connectors',
      validate: false,
    },
    async (ctx, request, res) => {
      const [, startDeps] = await core.getStartServices();
      const { actions } = startDeps;

      const connectors = await getConnectorList({
        request,
        actions,
      });

      return res.ok<ListConnectorsResponse>({
        body: { connectors },
      });
    }
  );
};
