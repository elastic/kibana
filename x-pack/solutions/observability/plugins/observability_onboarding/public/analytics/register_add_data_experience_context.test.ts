/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, Subject } from 'rxjs';
import {
  registerAddDataExperienceContext,
  type AddDataExperience,
} from './register_add_data_experience_context';

describe('registerAddDataExperienceContext', () => {
  let analytics: { registerContextProvider: jest.Mock };
  let experience$: Subject<AddDataExperience>;

  beforeEach(() => {
    analytics = {
      registerContextProvider: jest.fn(),
    };
    experience$ = new Subject<AddDataExperience>();
    registerAddDataExperienceContext(analytics, experience$);
  });

  it('registers a context provider named add_data_experience with the keyword schema', () => {
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    expect(analytics.registerContextProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'add_data_experience',
        schema: {
          add_data_experience: {
            type: 'keyword',
            _meta: expect.objectContaining({
              optional: true,
            }),
          },
        },
      })
    );
  });

  it("pushing 'v2' into the source observable makes context$ emit { add_data_experience: 'v2' }", async () => {
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[0];
    const result = firstValueFrom(context$);

    experience$.next('v2');

    await expect(result).resolves.toEqual({ add_data_experience: 'v2' });
  });

  it("pushing 'v1' emits { add_data_experience: 'v1' }", async () => {
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[0];
    const result = firstValueFrom(context$);

    experience$.next('v1');

    await expect(result).resolves.toEqual({ add_data_experience: 'v1' });
  });
});
