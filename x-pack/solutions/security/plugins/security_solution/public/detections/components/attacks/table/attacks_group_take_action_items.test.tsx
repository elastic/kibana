/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { AttacksGroupTakeActionItems } from './attacks_group_take_action_items';
import { getMockAttackDiscoveryAlerts } from '../../../../attack_discovery/pages/mock/mock_attack_discovery_alerts';
import { useAttacksPrivileges } from '../../../hooks/attacks/bulk_actions/use_attacks_privileges';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

jest.mock('../../../hooks/attacks/bulk_actions/use_attacks_privileges');
jest.mock('../../../../common/components/user_privileges', () => ({
  useUserPrivileges: () => ({
    timelinePrivileges: { read: true },
    detectionEnginePrivileges: { loading: false },
    rulesPrivileges: { rules: { read: true, edit: true } },
  }),
}));
jest.mock('../../../../common/hooks/use_license', () => ({
  useLicense: () => ({
    isPlatinumPlus: () => true,
  }),
}));
const mockUseAttacksPrivileges = useAttacksPrivileges as jest.MockedFunction<
  typeof useAttacksPrivileges
>;
const mockAttack = getMockAttackDiscoveryAlerts()[0];

function renderAttack(attack: AttackDiscoveryAlert) {
  return render(
    <TestProviders>
      <AttacksGroupTakeActionItems attack={attack} />
    </TestProviders>
  );
}

describe('AttacksGroupTakeActionItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAttacksPrivileges.mockReturnValue({
      hasIndexWrite: true,
      hasAttackIndexWrite: true,
      loading: false,
    });
  });

  describe('workflow items', () => {
    describe("when attack's status is open", () => {
      const openAttack = { ...mockAttack, alertWorkflowStatus: 'open' };

      it('should render the `acknowledged` action item', async () => {
        const { findByText } = renderAttack(openAttack);
        expect(await findByText('Mark as acknowledged')).toBeInTheDocument();
      });
      it('should render the `close` action item', async () => {
        const { findByText } = renderAttack(openAttack);
        expect(await findByText('Mark as closed')).toBeInTheDocument();
      });
      it('should NOT render the `open` action item', async () => {
        const { queryByText } = renderAttack(openAttack);
        expect(queryByText('Mark as open')).not.toBeInTheDocument();
      });
    });
    describe("when attack's status is closed", () => {
      const openAttack = { ...mockAttack, alertWorkflowStatus: 'closed' };

      it('should render the `acknowledged` action item', async () => {
        const { findByText } = renderAttack(openAttack);
        expect(await findByText('Mark as acknowledged')).toBeInTheDocument();
      });
      it('should NOT render the `close` action item', async () => {
        const { queryByText } = renderAttack(openAttack);
        expect(queryByText('Mark as closed')).not.toBeInTheDocument();
      });
      it('should render the `open` action item', async () => {
        const { findByText } = renderAttack(openAttack);
        expect(await findByText('Mark as open')).toBeInTheDocument();
      });
    });
    describe("when attack's status is acknowledged", () => {
      const openAttack = { ...mockAttack, alertWorkflowStatus: 'acknowledged' };

      it('should NOT render the `acknowledged` action item', async () => {
        const { queryByText } = renderAttack(openAttack);
        expect(queryByText('Mark as acknowledged')).not.toBeInTheDocument();
      });
      it('should render the `close` action item', async () => {
        const { findByText } = renderAttack(openAttack);
        expect(await findByText('Mark as closed')).toBeInTheDocument();
      });
      it('should render the `open` action item', async () => {
        const { findByText } = renderAttack(openAttack);
        expect(await findByText('Mark as open')).toBeInTheDocument();
      });
    });
  });

  describe('assignment', () => {
    it('should render the `assign` action item', async () => {
      const { findByText } = renderAttack(mockAttack);
      expect(await findByText('Assign alert')).toBeInTheDocument();
    });
    it('should render the `unassign` action item', async () => {
      const { findByText } = renderAttack(mockAttack);
      expect(await findByText('Unassign alert')).toBeInTheDocument();
    });
  });

  describe('tags', () => {
    it('should render the `apply tags` action item', async () => {
      const { findByText } = renderAttack(mockAttack);
      expect(await findByText('Apply alert tags')).toBeInTheDocument();
    });
  });

  describe('investigate in timeline', () => {
    it('should render the `Investigate in timeline` action item', async () => {
      const { findByText } = renderAttack(mockAttack);
      expect(await findByText('Investigate in timeline')).toBeInTheDocument();
    });
  });
});
