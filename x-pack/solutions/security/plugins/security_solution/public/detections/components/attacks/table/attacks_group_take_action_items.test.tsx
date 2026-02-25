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
import { useViewInAiAssistant } from '../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant';
import { useAttacksPrivileges } from '../../../hooks/attacks/bulk_actions/use_attacks_privileges';
import { useAttackViewInAiAssistantContextMenuItems } from '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_view_in_ai_assistant_context_menu_items';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

jest.mock(
  '../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant'
);
jest.mock('../../../hooks/attacks/bulk_actions/use_attacks_privileges');
jest.mock(
  '../../../hooks/attacks/bulk_actions/context_menu_items/use_attack_view_in_ai_assistant_context_menu_items'
);
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
const mockUseViewInAiAssistant = useViewInAiAssistant as jest.MockedFunction<
  typeof useViewInAiAssistant
>;
const mockUseAttackViewInAiAssistantContextMenuItems =
  useAttackViewInAiAssistantContextMenuItems as jest.MockedFunction<
    typeof useAttackViewInAiAssistantContextMenuItems
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
    mockUseViewInAiAssistant.mockReturnValue({
      showAssistantOverlay: jest.fn(),
      disabled: false,
      promptContextId: 'prompt-context-id',
    });
    mockUseAttackViewInAiAssistantContextMenuItems.mockReturnValue({
      items: [
        {
          name: 'View in AI Assistant',
          key: 'viewInAiAssistant',
          'data-test-subj': 'viewInAiAssistant',
        },
      ],
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

  describe('view in ai assistant', () => {
    it('should render the `View in AI Assistant` action item', async () => {
      const { findByText } = renderAttack(mockAttack);
      expect(await findByText('View in AI Assistant')).toBeInTheDocument();
    });

    it('should not render the action item when hook returns no items', async () => {
      mockUseAttackViewInAiAssistantContextMenuItems.mockReturnValue({
        items: [],
      });

      const { queryByText } = renderAttack(mockAttack);
      expect(queryByText('View in AI Assistant')).not.toBeInTheDocument();
    });
  });
});
