/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, type Observable } from 'rxjs';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

interface IsSpaceSupportedParams {
  isServerless: boolean;
  spaces: SpacesPluginStart | undefined;
}

/**
 * Emits once with `false` when the active space uses the Classic solution view. A space without a
 * solution is a Classic space. Serverless projects have no Classic space, so the answer is `true`
 * there. When the active space cannot be read, the answer is `false`: no access is the safe default.
 *
 * Mirrors `isSpaceSupported` in the server.
 */
export const isSpaceSupported$ = ({
  isServerless,
  spaces,
}: IsSpaceSupportedParams): Observable<boolean> => {
  if (isServerless) {
    return of(true);
  }
  if (!spaces) {
    return of(false);
  }
  return from(spaces.getActiveSpace()).pipe(
    map(({ solution = 'classic' }) => solution !== 'classic'),
    catchError(() => of(false))
  );
};
