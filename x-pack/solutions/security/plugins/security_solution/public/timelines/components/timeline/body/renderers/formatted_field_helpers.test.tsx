/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { RenderRuleName } from './formatted_field_helpers';
import { TestProviders } from '../../../../../common/mock';
import { createExpandableFlyoutApiMock } from '../../../../../common/mock/expandable_flyout';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useKibana } from '../../../../../common/lib/kibana';
import { useIsNewFlyoutEnabled } from '../../../../../common/hooks/use_is_new_flyout_enabled';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { RulePanelKey } from '../../../../../flyout/rule_details/right';
import { TimelineId, TimelineTabs } from '../../../../../../common/types/timeline';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';

vi.mock('@kbn/expandable-flyout');
vi.mock('../../../../../common/lib/kibana');
vi.mock('../../../../../common/components/link_to');
vi.mock('../../../../../common/components/user_privileges');
vi.mock('../../../../../common/hooks/use_is_new_flyout_enabled', () => {
      const mocked = {
      useIsNewFlyoutEnabled: vi.fn().mockReturnValue(false),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../../flyout_v2/use_flyout_api');

const useUserPrivilegesMock = useUserPrivileges as Mock;
const useKibanaMock = useKibana as Mock;

const mockNavigateToApp = vi.fn();
const mockOpenFlyout = vi.fn();

const inTimelineContext = {
  enableHostDetailsFlyout: true,
  enableIpDetailsFlyout: true,
  timelineID: TimelineId.active,
  tabType: TimelineTabs.query,
};

const defaultProps = {
  fieldName: 'kibana.alert.rule.name',
  linkValue: 'rule-id-123',
  value: 'Test Rule Name',
};

const flyoutApi = createFlyoutApiMock();

describe('RenderRuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
          getUrlForApp: vi.fn().mockReturnValue('/app/security/rules/id/rule-id-123'),
        },
      },
    });
    vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);
    vi.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    vi.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openFlyout: mockOpenFlyout,
    });
  });

  describe('link rendering based on rules read permission', () => {
    describe('when the user has read rule permissions', () => {
      beforeEach(() => {
        useUserPrivilegesMock.mockReturnValue({
          rulesPrivileges: {
            rules: { read: true, edit: false },
            exceptions: { read: false, crud: false },
          },
        });

        render(
          <TestProviders>
            <RenderRuleName {...defaultProps} />
          </TestProviders>
        );
      });
      it('renders the rule name as a link', () => {
        const element = screen.getByTestId('ruleName');
        expect(element).toBeInTheDocument();
        expect(element.tagName).toBe('A');
        expect(element).toHaveTextContent('Test Rule Name');
      });

      it('navigates to rule details when clicking the link', () => {
        const element = screen.getByTestId('ruleName');
        fireEvent.click(element);

        expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
        expect(mockNavigateToApp).toHaveBeenCalledWith(
          'securitySolutionUI',
          expect.objectContaining({
            deepLinkId: 'rules',
            path: expect.stringContaining('rule-id-123'),
          })
        );
      });
    });

    describe('when the user does not have read rule permissions', () => {
      beforeEach(() => {
        useUserPrivilegesMock.mockReturnValue({
          rulesPrivileges: {
            rules: { read: false, edit: false },
            exceptions: { read: false, crud: false },
          },
        });

        render(
          <TestProviders>
            <RenderRuleName {...defaultProps} />
          </TestProviders>
        );
      });
      it('renders the rule name as plain text', () => {
        const element = screen.getByTestId('ruleName');
        expect(element).toBeInTheDocument();
        expect(element.tagName).toBe('SPAN');
        expect(element).toHaveTextContent('Test Rule Name');
      });

      it('does not navigate when clicking rule name', () => {
        const element = screen.getByTestId('ruleName');
        fireEvent.click(element);

        expect(mockNavigateToApp).not.toHaveBeenCalled();
      });
    });
  });

  describe('when in a timeline context', () => {
    beforeEach(() => {
      useUserPrivilegesMock.mockReturnValue({
        rulesPrivileges: {
          rules: { read: true, edit: false },
          exceptions: { read: false, crud: false },
        },
      });
    });

    const renderInTimelineContext = () =>
      render(
        <TestProviders>
          <StatefulEventContext.Provider value={inTimelineContext}>
            <RenderRuleName {...defaultProps} />
          </StatefulEventContext.Provider>
        </TestProviders>
      );

    it('opens the legacy expandable flyout when the new flyout is disabled', () => {
      vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(false);

      renderInTimelineContext();
      fireEvent.click(screen.getByTestId('ruleName'));

      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: RulePanelKey,
          params: {
            ruleId: defaultProps.linkValue,
          },
        },
      });
      expect(flyoutApi.openRuleFlyout).not.toHaveBeenCalled();
      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });

    it('opens the new rule flyout when the new flyout is enabled', () => {
      vi.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);

      renderInTimelineContext();
      fireEvent.click(screen.getByTestId('ruleName'));

      expect(flyoutApi.openRuleFlyout).toHaveBeenCalledWith({
        ruleId: defaultProps.linkValue,
        origin: FLYOUT_ORIGIN.TABLE_FIELD_LINK,
        title: 'Rule: Test Rule Name',
      });
      expect(mockOpenFlyout).not.toHaveBeenCalled();
      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });
  });
});
