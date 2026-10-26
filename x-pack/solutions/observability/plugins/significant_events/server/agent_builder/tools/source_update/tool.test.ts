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
import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createSourceUpdateTool } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

describe('source_update tool', () => {
  const checkout = sourceWithSlug('checkout', {
    id: '67300f0f-8be7-490e-81f7-f2a098cabfed',
    title: 'Checkout',
    description: 'Checkout logs',
    tags: ['prod'],
    esql: 'FROM logs-checkout-*',
  });

  const createTool = ({
    featurePrivilege = 'all',
    update = jest.fn(),
    setEnabled = jest.fn(),
    maintenanceState = 'enabled',
    getState = jest.fn().mockResolvedValue(maintenanceState),
  }: {
    featurePrivilege?: NightshiftFeaturePrivilege;
    update?: jest.Mock;
    setEnabled?: jest.Mock;
    maintenanceState?: SignificantEventsMaintenanceState;
    getState?: jest.Mock;
  }) =>
    createSourceUpdateTool({
      ...createSourceToolDeps({
        featurePrivilege,
        sourcesClient: {
          list: jest.fn().mockResolvedValue({ sources: [checkout], total: 1 }),
          update,
          setEnabled,
        },
      }),
      maintenanceService: { getState },
    });

  beforeEach(() => {
    jest.mocked(assertSignificantEventsAccess).mockReset().mockResolvedValue(undefined);
  });

  it('changes only the given fields and keeps the rest', async () => {
    const renamed = { ...checkout, title: 'Checkout v2' };
    const disabled = { ...renamed, enabled: false };
    const update = jest.fn().mockResolvedValue(renamed);
    const setEnabled = jest.fn().mockResolvedValue(disabled);

    const result = await createTool({ update, setEnabled }).handler(
      { source: 'checkout', title: 'Checkout v2', tags: ['staging'], enabled: false },
      createMockToolContext()
    );

    expect(update).toHaveBeenCalledWith(checkout.id, {
      title: 'Checkout v2',
      description: 'Checkout logs',
      tags: ['staging'],
      esql: 'FROM logs-checkout-*',
    });
    expect(setEnabled).toHaveBeenCalledWith(checkout.id, false);
    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: expect.objectContaining({ title: 'Checkout v2', enabled: false }),
        },
      ],
    });
  });

  it('keeps the saved changes and reports the failure when only setting enabled fails', async () => {
    const renamed = { ...checkout, title: 'Checkout v2' };
    const update = jest.fn().mockResolvedValue(renamed);
    const setEnabled = jest.fn().mockRejectedValue(new Error('rules could not be aligned'));

    const result = await createTool({ update, setEnabled }).handler(
      { source: 'checkout', title: 'Checkout v2', enabled: false },
      createMockToolContext()
    );

    expect(result).toEqual({
      results: [
        {
          type: 'other',
          data: expect.objectContaining({
            title: 'Checkout v2',
            enabled_change_failed: {
              requested: false,
              message: expect.stringContaining('The other changes were saved'),
            },
          }),
        },
      ],
    });
  });

  it('returns an error when setting enabled fails and nothing else was changed', async () => {
    const update = jest.fn();
    const setEnabled = jest.fn().mockRejectedValue(new Error('rules could not be aligned'));

    const result = await createTool({ update, setEnabled }).handler(
      { source: 'checkout', enabled: false },
      createMockToolContext()
    );

    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: 'error',
          data: { message: expect.stringContaining('Failed to update source') },
        },
      ],
    });
  });

  it('only flips the enabled flag when nothing else is given, and flags a paused space', async () => {
    const update = jest.fn();
    const setEnabled = jest.fn().mockResolvedValue({ ...checkout, enabled: false });

    const result = await createTool({ update, setEnabled, maintenanceState: 'paused' }).handler(
      { source: 'checkout', enabled: false },
      createMockToolContext()
    );

    expect(update).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [{ type: 'other', data: expect.objectContaining({ onboarding_paused: true }) }],
    });
  });

  it('changes nothing when the pause state cannot be read', async () => {
    const update = jest.fn();
    const setEnabled = jest.fn();
    const getState = jest.fn().mockRejectedValue(new Error('state unavailable'));

    const result = await createTool({ update, setEnabled, getState }).handler(
      { source: 'checkout', title: 'Checkout v2', enabled: false },
      createMockToolContext()
    );

    expect(update).not.toHaveBeenCalled();
    expect(setEnabled).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        { type: 'error', data: { message: expect.stringContaining('Failed to update source') } },
      ],
    });
  });

  it('refuses a call that changes nothing', async () => {
    const update = jest.fn();
    const setEnabled = jest.fn();

    const result = await createTool({ update, setEnabled }).handler(
      { source: 'checkout' },
      createMockToolContext()
    );

    expect(update).not.toHaveBeenCalled();
    expect(setEnabled).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: 'error',
          data: { message: expect.stringContaining('Nothing to update') },
        },
      ],
    });
  });

  it('does not change a source without the Nightshift manage privilege', async () => {
    const update = jest.fn();
    const setEnabled = jest.fn();

    const result = await createTool({ featurePrivilege: 'read', update, setEnabled }).handler(
      { source: 'checkout', title: 'Checkout v2', enabled: false },
      createMockToolContext()
    );

    expect(update).not.toHaveBeenCalled();
    expect(setEnabled).not.toHaveBeenCalled();
    expect(result).toEqual({
      results: [
        {
          type: 'error',
          data: { message: expect.stringContaining('requires the Nightshift manage privilege') },
        },
      ],
    });
  });

  it('warns that a new query resets the source knowledge, and is marked destructive', async () => {
    const { annotations, confirmation } = createTool({});

    expect(annotations?.destructiveHint).toBe(true);
    expect(
      await confirmation?.getConfirmation?.({
        toolParams: { source: 'checkout', esql: 'FROM logs-checkout-v2-*' },
        context: createMockToolContext(),
      })
    ).toMatchObject({
      message: expect.stringContaining('so they are deleted and any running onboarding is stopped'),
      confirm_text: 'Save and reset knowledge',
    });
  });

  it('always asks the user to confirm and shows what changes', async () => {
    const { confirmation } = createTool({});

    expect(confirmation?.askUser).toBe('always');
    expect(
      await confirmation?.getConfirmation?.({
        toolParams: { source: 'checkout', title: 'Checkout v2', enabled: false },
        context: createMockToolContext(),
      })
    ).toMatchObject({
      message: expect.stringMatching(/checkout.*title: "Checkout v2".*enabled: false/),
      confirm_text: 'Update',
    });
  });
});
