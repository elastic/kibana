/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreRequestHandlerContext, KibanaResponseFactory } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

export const checkPrivileges = async (
  core: CoreRequestHandlerContext,
  response: KibanaResponseFactory
) => {
  const user = core.security?.authc.getCurrentUser();
  if (!user) {
    return response.customError({
      statusCode: 502,
      body: i18n.translate('xpack.search.queryRules.api.routes.noUserError', {
        defaultMessage: 'Could not retrieve current user, security plugin is not ready',
      }),
    });
  }
  const hasPrivilege = await core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
    cluster: ['manage_search_query_rules'],
  });
  if (!hasPrivilege.has_all_requested) {
    response.forbidden({
      body: i18n.translate('xpack.search.queryRules.api.routes.permissionError', {
        defaultMessage: "You don't have manage_search_query_rules privileges",
      }),
    });
  }
};
