/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { DownloadScriptRequestParams } from '../../../../common/api/endpoint/scripts_library/download_script';
import { DownloadScriptRequestSchema } from '../../../../common/api/endpoint/scripts_library';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { errorHandler } from '../error_handler';

export const getDownloadScriptRequestHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<
  DownloadScriptRequestParams,
  undefined,
  undefined,
  SecuritySolutionRequestHandlerContext
> => {
  const logger = endpointAppServices.createLogger('downloadScriptRouteHandler');

  return async (context, req, res) => {
    const scriptId = req.params.script_id;
    logger.debug(() => `Download script: ${scriptId}`);

    try {
      const spaceId = (await context.securitySolution).getSpaceId();
      const user = (await context.core).security.authc.getCurrentUser();
      const scriptsClient = endpointAppServices.getScriptsLibraryClient(
        spaceId,
        user?.username || 'unknown'
      );

      const { fileName, stream } = await scriptsClient.download(scriptId);

      return res.ok({
        body: stream,
        headers: {
          'content-type': 'application/octet-stream',
          'cache-control': 'max-age=31536000, immutable',
          'content-disposition': `attachment; filename="${fileName ?? `script_${scriptId}.zip`}"`,
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
          'x-content-type-options': 'nosniff',
        },
      });
    } catch (err) {
      return errorHandler(logger, res, err);
    }
  };
};

export const registerDownloadScriptRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  router.versioned
    .get({
      access: 'public',
      enableQueryVersion: true,
      path: SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
        authc: { enabled: true },
      },
      options: {
        availability: {
          since: '9.4.0',
          stability: 'stable',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: DownloadScriptRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadScriptsLibrary'] },
        endpointContext.logFactory.get('downloadScriptRoute'),
        getDownloadScriptRequestHandler(endpointContext.service)
      )
    );
};
