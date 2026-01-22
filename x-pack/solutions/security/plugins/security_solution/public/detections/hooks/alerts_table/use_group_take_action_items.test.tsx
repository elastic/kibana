/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { useGroupTakeActionsItems } from './use_group_take_action_items';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';

jest.mock('../../containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn(),
}));

const mockUseAlertsPrivileges = useAlertsPrivileges as jest.Mock;

describe('useGroupTakeActionsItems', () => {
  const wrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <TestProviders>{children}</TestProviders>
  );
  const getActionItemsParams = {
    tableId: 'mock-id',
    groupNumber: 0,
    selectedGroup: 'test',
  };

  beforeEach(() => {
    mockUseAlertsPrivileges.mockReturnValue({ hasAlertsAll: true });
  });

  it('returns all take actions items if showAlertStatusActions is true and currentStatus is undefined', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );

    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(3);
  });

  it('returns all take actions items if currentStatus is []', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: [],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(3);
  });

  it('returns all take actions items if currentStatus.length > 1', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['open', 'closed'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(3);
  });

  it('returns acknowledged & closed take actions items if currentStatus === ["open"]', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['open'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );

    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('data-test-subj')).toBe('acknowledged-alert-status');
    expect(buttons[1].getAttribute('data-test-subj')).toBe('alert-close-context-menu-item');
  });

  it('returns open & acknowledged take actions items if currentStatus === ["closed"]', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['closed'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );

    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('data-test-subj')).toBe('open-alert-status');
    expect(buttons[1].getAttribute('data-test-subj')).toBe('acknowledged-alert-status');
  });

  it('returns open & closed take actions items if currentStatus === ["acknowledged"]', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          currentStatus: ['acknowledged'],
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );

    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('data-test-subj')).toBe('open-alert-status');
    expect(buttons[1].getAttribute('data-test-subj')).toBe('alert-close-context-menu-item');
  });

  it('returns empty take actions items if showAlertStatusActions is false', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          showAlertStatusActions: false,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(0);
  });

  it('returns array take actions items if showAlertStatusActions is true', async () => {
    const { result } = renderHook(
      () =>
        useGroupTakeActionsItems({
          showAlertStatusActions: true,
        }),
      {
        wrapper: wrapperContainer,
      }
    );
    const { queryAllByRole } = render(result.current(getActionItemsParams));
    const buttons = await queryAllByRole('button');

    expect(buttons.length).toBe(3);
  });

  describe('when the user does not have alert edit privileges', () => {
    beforeEach(() => {
      mockUseAlertsPrivileges.mockReturnValue({ hasAlertsAll: false });
    });

    it('returns empty take actions items', async () => {
      const { result } = renderHook(
        () =>
          useGroupTakeActionsItems({
            showAlertStatusActions: true,
          }),
        {
          wrapper: wrapperContainer,
        }
      );
      await waitFor(() => expect(result.current(getActionItemsParams)).toBeUndefined());
    });
  });
});
