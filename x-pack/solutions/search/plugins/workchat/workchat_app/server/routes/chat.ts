/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';

export const registerChatRoutes = ({ router }: { router: IRouter }) => {
  router.post(
    {
      path: '/internal/workchat/chat',
      validate: false,
    },
    async (ctx, req, res) => {
      return res.ok();
    }
  );
};
