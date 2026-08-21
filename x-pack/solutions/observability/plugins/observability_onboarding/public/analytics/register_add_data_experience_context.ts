/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { AnalyticsServiceSetup } from '@kbn/core/public';

export type AddDataExperience = 'v1' | 'v2';

interface AddDataExperienceContext {
  add_data_experience?: AddDataExperience;
}

export function registerAddDataExperienceContext(
  analytics: Pick<AnalyticsServiceSetup, 'registerContextProvider'>,
  experience$: Observable<AddDataExperience>
) {
  analytics.registerContextProvider({
    name: 'add_data_experience',
    context$: experience$.pipe(
      map((experience): AddDataExperienceContext => ({ add_data_experience: experience }))
    ),
    schema: {
      add_data_experience: {
        type: 'keyword',
        _meta: {
          description:
            'Which Add Data page experience the session runs, v1 (legacy) or v2 (redesign behind observability.addDataPageV2Enabled).',
          optional: true,
        },
      },
    },
  });
}
