/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePatchEndpointScript, usePostEndpointScript } from '../../../../hooks/script_library';
import type { ScriptLibraryUrlParams } from '../components/script_library_url_params';

export const useWithScriptSubmit = (
  show: Extract<Required<ScriptLibraryUrlParams>['show'], 'edit' | 'create'>
) => {
  return show === 'create' ? usePostEndpointScript : usePatchEndpointScript;
};
