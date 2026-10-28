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
import { createSourceDeleteTool } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('source_delete tool', () => {
  const checkout = sourceWithSlug('checkout', {
    id: '67300f0f-8be7-490e-81f7-f2a098cabfed',
    title: 'Checkout',
  });

  const createTool = ({
    featurePrivilege = 'all',
    deleteSource = jest.fn(),
  }: {
    featurePrivilege?: NightshiftFeaturePrivilege;
    deleteSource?: jest.Mock;
  }) =>
    createSourceDeleteTool({
      ...createSourceToolDeps({
        featurePrivilege,
        sourcesClient: {
          list: jest.fn().mockResolvedValue({ sources: [checkout], total: 1 }),
          delete: deleteSource,
        },
      }),
    });

  beforeEach(() => {
    jest.mocked(assertSignificantEventsAccess).mockReset().mockResolvedValue(undefined);
  });

  it('deletes the source found by slug', async () => {
    const deleteSource = jest.fn().mockResolvedValue(undefined);

    const result = await createTool({ deleteSource }).handler(
      { source: 'checkout' },
      createMockToolContext()
    );

    expect(deleteSource).toHaveBeenCalledWith(checkout.id);
    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: { deleted: true, id: checkout.id, slug: 'checkout', title: 'Checkout' },
        },
      ],
    });
  });

  it('does not delete a source without the Nightshift manage privilege', async () => {
    const deleteSource = jest.fn();

    const result = await createTool({ featurePrivilege: 'read', deleteSource }).handler(
      { source: 'checkout' },
      createMockToolContext()
    );

    expect(deleteSource).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: 'error',
          data: { message: expect.stringContaining('requires the Nightshift manage privilege') },
        },
      ],
    });
  });

  it('always asks the user to confirm', async () => {
    const { confirmation } = createTool({});

    expect(confirmation?.askUser).toBe('always');
    expect(
      await confirmation?.getConfirmation?.({
        toolParams: { source: 'checkout' },
        context: createMockToolContext(),
      })
    ).toMatchObject({ message: expect.stringContaining('checkout') });
  });
});
