/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDeleteScriptRoute } from './delete_script';
import { registerGetScriptRoute } from './get_script';
import { registerDownloadScriptRoute } from './download_script';
import { registerPatchUpdateScriptRoute } from './update_script';
import { registerListScriptsRoute } from './list_scripts';
import { registerCreateScriptRoute } from './create_script';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';

export const registerScriptsLibraryRoutes = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  if (endpointContext.experimentalFeatures.responseActionsScriptLibraryManagement) {
    endpointContext.logFactory.get('scriptsLibrary').debug('Registering scripts library routes');

    registerCreateScriptRoute(router, endpointContext);
    registerListScriptsRoute(router, endpointContext);
    registerPatchUpdateScriptRoute(router, endpointContext);
    registerDownloadScriptRoute(router, endpointContext);
    registerGetScriptRoute(router, endpointContext);
    registerDeleteScriptRoute(router, endpointContext);
  }
};
