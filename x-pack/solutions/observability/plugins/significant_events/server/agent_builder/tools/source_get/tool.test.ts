/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftFeaturePrivilege } from '../../utils/test_helpers';
import {
  createMockToolContext,
  createSourceToolDeps,
  sourceWithSlug,
} from '../../utils/test_helpers';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSourceGetTool } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('source_get tool', () => {
  const checkout = sourceWithSlug('checkout', {
    id: '67300f0f-8be7-490e-81f7-f2a098cabfed',
    title: 'Checkout',
    esql: 'FROM logs-checkout-*',
    type: 'logs',
  });

  const getSourceAs = async ({
    featurePrivilege,
    source,
  }: {
    featurePrivilege: NightshiftFeaturePrivilege;
    source: string;
  }) => {
    const get = jest.fn().mockResolvedValue({ source: checkout, health: 'view_drift' });
    const tool = createSourceGetTool({
      ...createSourceToolDeps({
        featurePrivilege,
        sourcesClient: {
          list: jest.fn().mockResolvedValue({ sources: [checkout], total: 1 }),
          get,
        },
      }),
    });
    const result = await tool.handler({ source }, createMockToolContext());
    return { result, get };
  };

  beforeEach(() => {
    jest.mocked(assertSignificantEventsAccess).mockReset().mockResolvedValue(undefined);
  });

  it('returns a source found by slug with the health of its view', async () => {
    const { result, get } = await getSourceAs({ featurePrivilege: 'read', source: 'checkout' });

    expect(get).toHaveBeenCalledWith(checkout.id);
    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: expect.objectContaining({
            id: checkout.id,
            slug: 'checkout',
            title: 'Checkout',
            esql: 'FROM logs-checkout-*',
            health: 'view_drift',
          }),
        },
      ],
    });
  });

  it('returns an explicit not-found error for an unknown source', async () => {
    const { result, get } = await getSourceAs({ featurePrivilege: 'read', source: 'missing' });

    expect(get).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      results: [
        {
          type: 'error',
          data: { message: expect.stringContaining('Source not found in this space: missing') },
        },
      ],
    });
  });

  it('does not return a source without the Nightshift read privilege', async () => {
    const { result, get } = await getSourceAs({ featurePrivilege: 'none', source: 'checkout' });

    expect(get).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      results: [
        {
          type: 'error',
          data: { message: expect.stringContaining('requires the Nightshift read privilege') },
        },
      ],
    });
  });
});
