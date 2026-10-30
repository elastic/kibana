/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { NightshiftFeaturePrivilege } from '../../utils/test_helpers';
import {
  createMockToolContext,
  createSourceToolDeps,
  sourceWithSlug,
} from '../../utils/test_helpers';
import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSourceCreateTool } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('source_create tool', () => {
  const params = {
    title: 'Checkout',
    description: 'Checkout logs',
    tags: ['prod'],
    esql: 'FROM logs-checkout-*',
  };
  const checkout = sourceWithSlug('checkout', { ...params, type: 'logs' });

  const createTool = ({
    featurePrivilege = 'all',
    create = jest.fn().mockResolvedValue(checkout),
    maintenanceState = 'enabled',
    getState = jest.fn().mockResolvedValue(maintenanceState),
  }: {
    featurePrivilege?: NightshiftFeaturePrivilege;
    create?: jest.Mock;
    maintenanceState?: SignificantEventsMaintenanceState;
    getState?: jest.Mock;
  }) =>
    createSourceCreateTool({
      ...createSourceToolDeps({ featurePrivilege, sourcesClient: { create } }),
      maintenanceService: { getState },
    });

  beforeEach(() => {
    jest.mocked(assertSignificantEventsAccess).mockReset().mockResolvedValue(undefined);
  });

  it('creates the source and flags a paused space', async () => {
    const create = jest.fn().mockResolvedValue(checkout);

    const active = await createTool({ create }).handler(params, createMockToolContext());
    const paused = await createTool({ create, maintenanceState: 'paused' }).handler(
      params,
      createMockToolContext()
    );

    expect(create).toHaveBeenCalledWith(params);
    expect(active).toEqual({
      results: [
        {
          type: 'other',
          data: expect.objectContaining({ slug: 'checkout', title: 'Checkout', type: 'logs' }),
        },
      ],
    });
    expect(active).toEqual({
      results: [{ type: 'other', data: expect.not.objectContaining({ onboarding_paused: true }) }],
    });
    expect(paused).toEqual({
      results: [{ type: 'other', data: expect.objectContaining({ onboarding_paused: true }) }],
    });
  });

  it('does not create the source when the pause state cannot be read', async () => {
    const create = jest.fn();
    const getState = jest.fn().mockRejectedValue(new Error('state unavailable'));

    const result = await createTool({ create, getState }).handler(params, createMockToolContext());

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        { type: 'error', data: { message: expect.stringContaining('Failed to create source') } },
      ],
    });
  });

  it('relays the reason a query is refused', async () => {
    const create = jest.fn().mockRejectedValue(Boom.badRequest('Query must start with FROM or TS'));

    const result = await createTool({ create }).handler(params, createMockToolContext());

    expect(result).toEqual({
      results: [
        {
          type: 'error',
          data: { message: 'Failed to create source: Query must start with FROM or TS' },
        },
      ],
    });
  });

  it('does not create a source without the Nightshift manage privilege', async () => {
    const create = jest.fn();

    const result = await createTool({ featurePrivilege: 'read', create }).handler(
      params,
      createMockToolContext()
    );

    expect(create).not.toHaveBeenCalled();
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
        toolParams: params,
        context: createMockToolContext(),
      })
    ).toMatchObject({
      message: expect.stringContaining('Checkout'),
    });
  });
});
