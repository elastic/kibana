/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { SLO_COMPOSITE_ENABLED } from '../../common/feature_flags';
import { isCompositeSloEnabled } from './is_composite_slo_enabled';

describe('isCompositeSloEnabled', () => {
  it('reads from getBooleanValue$ on the start contract', async () => {
    const getBooleanValue$ = jest.fn().mockReturnValue(of(true));

    await expect(isCompositeSloEnabled({ getBooleanValue$ })).resolves.toBe(true);
    expect(getBooleanValue$).toHaveBeenCalledWith(SLO_COMPOSITE_ENABLED, false);
  });

  it('reads from getBooleanValue on the request-handler context', async () => {
    const getBooleanValue = jest.fn().mockResolvedValue(false);

    await expect(isCompositeSloEnabled({ getBooleanValue })).resolves.toBe(false);
    expect(getBooleanValue).toHaveBeenCalledWith(SLO_COMPOSITE_ENABLED, false);
  });
});
