/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePostEndpointScript, usePatchEndpointScript } from '../../../../hooks/script_library';
import type { ScriptsLibraryUrlParams } from '../components/scripts_library_url_params';

export const useWithScriptSubmit = (
  show: Extract<Required<ScriptsLibraryUrlParams>['show'], 'edit' | 'create'>
) => {
  return show === 'create' ? usePostEndpointScript : usePatchEndpointScript;
};
