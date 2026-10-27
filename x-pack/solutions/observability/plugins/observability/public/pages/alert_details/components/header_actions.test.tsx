/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { allCasesPermissions, noCasesPermissions } from '@kbn/observability-shared-plugin/public';

import { render } from '../../../utils/test_helper';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { createTelemetryClientMock } from '../../../services/telemetry/telemetry_client.mock';
import { alertWithGroupsAndTags, mockAlertUuid, untrackedAlert } from '../mock/alert';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { useAlertSnoozeState } from '../hooks/use_alert_snooze_state';

import { HeaderActions } from './header_actions';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { AlertStatus } from '@kbn/rule-data-utils';
import { ALERT_STATUS } from '@kbn/rule-data-utils';
import { useAlertSnooze } from '@kbn/response-ops-alert-snooze';
import { paths } from '../../../../common/locators/paths';
import { useInvestigateAlert } from '../../../hooks/use_investigate_alert';

jest.mock('../../../utils/kibana_react');
jest.mock('../../../hooks/use_fetch_rule');
jest.mock('../hooks/use_alert_snooze_state');
jest.mock('../../../hooks/use_investigate_alert', () => ({
  useInvestigateAlert: jest.fn(),
}));

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alert_field_names', () => ({
  useAlertFieldNames: () => ({ fieldNames: [], isLoading: false }),
}));

jest.mock('@kbn/response-ops-alert-snooze', () => ({
  useAlertSnooze: jest.fn(),
  AlertSnoozePanelInline: jest.fn(({ onApply, onBack }) => (
    <div data-test-subj="alertSnoozePanelInlineMock">
      <button
        type="button"
        data-test-subj="applySnoozeMock"
        onClick={() => onApply({ expiresAt: '2021-10-10T00:00:00.000Z' })}
      >
        apply
      </button>
      <button type="button" data-test-subj="backSnoozeMock" onClick={onBack}>
        back
      </button>
    </div>
  )),
}));

const mockUseGetRuleTypesPermissions = jest.fn(() => ({
  authorizedToReadRuleType: (): boolean => true,
}));
jest.mock('@kbn/alerts-ui-shared/src/common/hooks', () => ({
  ...jest.requireActual('@kbn/alerts-ui-shared/src/common/hooks'),
  useGetRuleTypesPermissions: () => mockUseGetRuleTypesPermissions(),
}));

const useKibanaMock = useKibana as jest.Mock;
const useFetchRuleMock = useFetchRule as jest.Mock;
const useAlertSnoozeStateMock = useAlertSnoozeState as jest.Mock;
const useAlertSnoozeMock = useAlertSnooze as jest.Mock;
const useInvestigateAlertMock = useInvestigateAlert as jest.Mock;
const mockCases = casesPluginMock.createStartContract();

const mockHttp = {
  post: jest.fn(),
  basePath: {
    prepend: (url: string) => `wow${url}`,
  },
};

const mockNavigateToApp = {
  mockNavigateToApp: jest.fn(),
  capabilities: { agentBuilder: { write: true } },
};

jest.mock('@kbn/response-ops-rule-form/flyout', () => ({
  RuleFormFlyout: jest.fn(() => <div data-test-subj="edit-rule-flyout">mocked component</div>),
}));

const mockKibana = () => {
  mockCases.helpers.canUseCases = jest.fn().mockReturnValue(allCasesPermissions());
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract(),
      triggersActionsUi: {
        ...triggersActionsUiMock.createStart(),
      },
      cases: mockCases,
      http: mockHttp,
      application: mockNavigateToApp,
      telemetryClient: createTelemetryClientMock(),
    },
  });
};

const mockRuleId = '123';
const mockRuleName = '456';
const mockRuleTypeId = 'mocked-type-id';

const mockUseFetchRuleWithData = () => {
  useFetchRuleMock.mockReturnValue({
    reloadRule: jest.fn(),
    rule: {
      id: mockRuleId,
      name: mockRuleName,
    },
  });
};
const mockUseFetchRuleWithoutData = () => {
  useFetchRuleMock.mockReturnValue({
    reloadRule: jest.fn(),
    rule: null,
  });
};

const mockOnUntrackAlert = () => {};

const snoozeStateWithoutInstance = {
  ruleId: undefined,
  instanceId: undefined,
  isMuted: false,
  isSnoozed: false,
  snoozedInstance: undefined,
  refetch: jest.fn(),
  isLoading: false,
};

const mockInvestigation = (overrides: Partial<ReturnType<typeof useInvestigateAlert>> = {}) => {
  useInvestigateAlertMock.mockReturnValue({
    showInvestigateAction: true,
    showInvestigateButton: false,
    showViewInvestigation: true,
    hasInvestigation: true,
    handleInvestigate: jest.fn(),
    isInvestigating: false,
    isStarting: false,
    investigateActionLabel: 'Investigate',
    viewInvestigationUrl: '/app/nightshift?investigationId=investigation-1',
    viewInvestigationActionLabel: 'View investigation',
    markInvestigationViewed: jest.fn(),
    ...overrides,
  });
};

describe('Header Actions', () => {
  beforeEach(() => {
    mockInvestigation();
    useAlertSnoozeStateMock.mockReturnValue(snoozeStateWithoutInstance);
    useAlertSnoozeMock.mockReturnValue({
      snoozeAlert: jest.fn().mockResolvedValue(true),
      unsnoozeAlert: jest.fn().mockResolvedValue(true),
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseGetRuleTypesPermissions.mockReturnValue({ authorizedToReadRuleType: () => true });
  });

  describe('Header Actions - Enabled', () => {
    beforeEach(() => {
      mockKibana();
      mockUseFetchRuleWithData();
    });
    it('should offer an "Add to case" button which opens the add to case modal', async () => {
      let attachments: any[] = [];

      const useCasesAddToExistingCaseModalMock: any = jest.fn().mockImplementation(() => ({
        open: ({ getAttachments }: { getAttachments: () => any[] }) => {
          attachments = getAttachments();
        },
      })) as CasesPublicStart['hooks']['useCasesAddToExistingCaseModal'];

      mockCases.hooks.useCasesAddToExistingCaseModal = useCasesAddToExistingCaseModalMock;

      const { getByTestId, findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex={'alert-index'}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
          // @ts-expect-error partial implementation for testing
          rule={{
            id: mockRuleId,
            name: mockRuleName,
            ruleTypeId: mockRuleTypeId,
          }}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      fireEvent.click(getByTestId(`add-to-cases-button-mocked-type-id`));

      expect(attachments).toEqual([
        {
          type: 'observability.alert',
          attachmentId: mockAlertUuid,
          metadata: {
            index: 'alert-index',
            rule: {
              id: mockRuleId,
              name: mockRuleName,
            },
          },
        },
      ]);
    });

    const renderInvestigationActions = (alert = alertWithGroupsAndTags) =>
      render(
        <HeaderActions
          alert={alert}
          alertIndex="alert-index"
          alertStatus={alert.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
        />
      );

    it('starts an investigation from the header without opening overflow', () => {
      const handleInvestigate = jest.fn();
      mockInvestigation({
        showInvestigateButton: true,
        showViewInvestigation: false,
        hasInvestigation: false,
        viewInvestigationUrl: undefined,
        handleInvestigate,
      });
      const { getByTestId } = renderInvestigationActions();

      fireEvent.click(getByTestId('alertDetailsInvestigate'));

      expect(handleInvestigate).toHaveBeenCalledTimes(1);
      expect(useInvestigateAlertMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ alertId: mockAlertUuid })
      );
      expect(useInvestigateAlertMock).not.toHaveBeenLastCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });

    it.each([false, true])(
      'links to an existing investigation with running=%s',
      (isInvestigating) => {
        const markInvestigationViewed = jest.fn();
        mockInvestigation({
          isInvestigating,
          showViewInvestigation: !isInvestigating,
          markInvestigationViewed,
          viewInvestigationEbtProps: {
            'data-ebt-action': 'viewInvestigation',
            'data-ebt-element': 'alertDetailsPageActions',
            'data-ebt-detail': isInvestigating ? 'running' : 'completed',
          },
        });
        const { getByTestId, queryByTestId } = renderInvestigationActions();
        const button = getByTestId('alertDetailsViewInvestigation');

        expect(button).toHaveTextContent('View investigation');
        expect(button).toHaveAttribute('href', '/app/nightshift?investigationId=investigation-1');
        expect(button).toHaveAttribute(
          'data-ebt-detail',
          isInvestigating ? 'running' : 'completed'
        );
        expect(queryByTestId('alertDetailsInvestigate')).not.toBeInTheDocument();
        fireEvent.click(button, { ctrlKey: true });
        expect(markInvestigationViewed).toHaveBeenCalledTimes(1);
      }
    );

    it('disables the header button while starting, preventing another start', () => {
      const handleInvestigate = jest.fn();
      mockInvestigation({
        showInvestigateButton: false,
        showViewInvestigation: false,
        hasInvestigation: false,
        viewInvestigationUrl: undefined,
        isStarting: true,
        isInvestigating: true,
        investigateActionLabel: 'Investigating…',
        handleInvestigate,
      });
      const { getByTestId } = renderInvestigationActions();
      const button = getByTestId('alertDetailsInvestigate');

      expect(button).toHaveTextContent('Investigating…');
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(handleInvestigate).not.toHaveBeenCalled();
    });

    it.each([
      { showInvestigateAction: false },
      { showInvestigateButton: false, hasInvestigation: false },
    ])('hides the header action before availability/status succeeds: %s', (state) => {
      mockInvestigation({ ...state, viewInvestigationUrl: undefined });
      const { queryByTestId } = renderInvestigationActions();

      expect(queryByTestId('alertDetailsInvestigate')).not.toBeInTheDocument();
      expect(queryByTestId('alertDetailsViewInvestigation')).not.toBeInTheDocument();
    });

    it('hides the investigation header button when the alert is missing', () => {
      const { queryByTestId } = render(
        <HeaderActions alert={null} onUntrackAlert={mockOnUntrackAlert} refetch={jest.fn()} />
      );

      expect(queryByTestId('alertDetailsInvestigate')).not.toBeInTheDocument();
      expect(queryByTestId('alertDetailsViewInvestigation')).not.toBeInTheDocument();
    });

    it('keeps only Re-investigate in overflow after a finished investigation was viewed', () => {
      const handleInvestigate = jest.fn();
      mockInvestigation({
        showInvestigateButton: true,
        investigateActionLabel: 'Re-investigate',
        handleInvestigate,
      });
      const { getByTestId, getByRole } = renderInvestigationActions();

      expect(getByTestId('alertDetailsViewInvestigation')).toBeVisible();
      fireEvent.click(getByTestId('alert-details-header-actions-menu-button'));
      const menu = within(getByRole('dialog', { name: 'Actions' }));
      expect(menu.queryByTestId('alertDetailsInvestigate')).not.toBeInTheDocument();
      expect(menu.queryByTestId('alertDetailsViewInvestigation')).not.toBeInTheDocument();
      fireEvent.click(menu.getByTestId('alertDetailsReinvestigate'));
      expect(handleInvestigate).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])(
      'hides Re-investigate for an unviewed or running investigation: %s',
      (isInvestigating) => {
        mockInvestigation({ isInvestigating });
        const { getByTestId, queryByTestId } = renderInvestigationActions();

        fireEvent.click(getByTestId('alert-details-header-actions-menu-button'));
        expect(queryByTestId('alertDetailsReinvestigate')).not.toBeInTheDocument();
      }
    );

    it('should NOT offer an "Add to case" button without cases privileges', async () => {
      mockCases.helpers.canUseCases = jest.fn().mockReturnValue(noCasesPermissions());

      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex={'alert-index'}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
          // @ts-expect-error partial implementation for testing
          rule={{
            id: mockRuleId,
            name: mockRuleName,
            ruleTypeId: mockRuleTypeId,
          }}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId(`add-to-cases-button-${mockRuleTypeId}`)).not.toBeInTheDocument();
    });

    it('should not offer a "Snooze the rule" button', async () => {
      const { queryByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex={'alert-index'}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
          // @ts-expect-error partial implementation for testing
          rule={{
            id: mockRuleId,
            name: mockRuleName,
          }}
        />
      );

      expect(queryByTestId('snooze-rule-button')).toBeFalsy();
    });

    it('should display an actions button', () => {
      const { queryByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
        />
      );
      expect(queryByTestId('alert-details-header-actions-menu-button')).toBeTruthy();
    });

    describe('when clicking the actions button', () => {
      it('should offer a "Snooze the rule" button', async () => {
        const { getByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
            refetch={jest.fn()}
            // @ts-expect-error partial implementation for testing
            rule={{
              id: mockRuleId,
              name: mockRuleName,
            }}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        expect(getByTestId('snooze-rule-button')).toBeDefined();
      });

      it('should offer a "Edit rule" button which opens the edit rule flyout', async () => {
        const { getByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
            refetch={jest.fn()}
            // @ts-expect-error partial implementation for testing
            rule={{
              id: mockRuleId,
              name: mockRuleName,
            }}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        fireEvent.click(await findByTestId('edit-rule-button'));
        expect(getByTestId('edit-rule-flyout')).toBeDefined();
      });

      it('should offer a "Mark as untracked" button which is enabled', async () => {
        const { queryByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
            refetch={jest.fn()}
            // @ts-expect-error partial implementation for testing
            rule={{
              id: mockRuleId,
              name: mockRuleName,
            }}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        expect(queryByTestId('untrack-alert-button')).not.toHaveAttribute('disabled');
      });

      it('should offer a "Go to rule details" button which opens the rule details page in a new tab', async () => {
        const { queryByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
            refetch={jest.fn()}
            // @ts-expect-error partial implementation for testing
            rule={{
              id: mockRuleId,
              name: mockRuleName,
            }}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        expect(queryByTestId('view-rule-details-button')).toHaveProperty(
          'href',
          `http://localhost/wow${paths.observability.ruleDetails(mockRuleId)}`
        );
        expect(queryByTestId('view-rule-details-button')).toHaveProperty('target', '_blank');
      });

      it('should NOT offer a "Go to rule details" button when unauthorized to read the rule type', async () => {
        mockUseGetRuleTypesPermissions.mockReturnValue({ authorizedToReadRuleType: () => false });
        const { queryByTestId, findByTestId } = render(
          <HeaderActions
            alert={alertWithGroupsAndTags}
            alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
            onUntrackAlert={mockOnUntrackAlert}
            refetch={jest.fn()}
            // @ts-expect-error partial implementation for testing
            rule={{
              id: mockRuleId,
              name: mockRuleName,
            }}
          />
        );

        fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
        expect(queryByTestId('view-rule-details-button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Header Actions - Disabled', () => {
    beforeEach(() => {
      mockKibana();
      mockUseFetchRuleWithoutData();
    });

    it("should disable the 'Edit rule' when the rule is not available/deleted", async () => {
      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('edit-rule-button')).toHaveAttribute('disabled');
    });

    it('should disable the "Mark as untracked" button when alert status is untracked', async () => {
      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={untrackedAlert}
          alertStatus={untrackedAlert.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('untrack-alert-button')).toHaveAttribute('disabled');
    });

    it("should disable the 'View rule details' when the rule is not available/deleted", async () => {
      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
        />
      );
      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('view-rule-details-button')).toHaveAttribute('disabled');
    });
  });

  describe('per-alert snooze', () => {
    const snoozedState = {
      ruleId: mockRuleId,
      instanceId: '*',
      isMuted: false,
      isSnoozed: false,
      snoozedInstance: undefined,
      refetch: jest.fn(),
      isLoading: false,
    };

    beforeEach(() => {
      mockKibana();
      mockUseFetchRuleWithData();
    });

    const renderHeaderActions = () =>
      render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={jest.fn()}
          // @ts-expect-error partial implementation for testing
          rule={{
            id: mockRuleId,
            name: mockRuleName,
          }}
        />
      );

    it('offers a "Snooze the alert" button when the alert is neither muted nor snoozed', async () => {
      useAlertSnoozeStateMock.mockReturnValue(snoozedState);

      const { findByTestId, queryByTestId } = renderHeaderActions();

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));

      expect(await findByTestId('snooze-alert-button')).toBeInTheDocument();
      expect(queryByTestId('unsnooze-alert-button')).toBeNull();
    });

    it('opens the inline snooze form and applies the snooze payload', async () => {
      const snoozeAlert = jest.fn().mockResolvedValue(true);
      useAlertSnoozeMock.mockReturnValue({ snoozeAlert, unsnoozeAlert: jest.fn() });
      useAlertSnoozeStateMock.mockReturnValue(snoozedState);

      const { findByTestId } = renderHeaderActions();

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      fireEvent.click(await findByTestId('snooze-alert-button'));
      fireEvent.click(await findByTestId('applySnoozeMock'));

      await waitFor(() =>
        expect(snoozeAlert).toHaveBeenCalledWith({ expiresAt: '2021-10-10T00:00:00.000Z' })
      );
    });

    it('offers an "Unsnooze the alert" button when the alert is snoozed and unsnoozes it on click', async () => {
      const unsnoozeAlert = jest.fn().mockResolvedValue(true);
      useAlertSnoozeMock.mockReturnValue({ snoozeAlert: jest.fn(), unsnoozeAlert });
      useAlertSnoozeStateMock.mockReturnValue({
        ...snoozedState,
        isSnoozed: true,
        snoozedInstance: { instanceId: '*' },
      });

      const { findByTestId, queryByTestId } = renderHeaderActions();

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));

      expect(await findByTestId('unsnooze-alert-button')).toBeInTheDocument();
      expect(queryByTestId('snooze-alert-button')).toBeNull();

      fireEvent.click(await findByTestId('unsnooze-alert-button'));

      await waitFor(() => expect(unsnoozeAlert).toHaveBeenCalled());
    });

    it('offers the "Unsnooze the alert" button when the alert is muted', async () => {
      useAlertSnoozeStateMock.mockReturnValue({ ...snoozedState, isMuted: true });

      const { findByTestId } = renderHeaderActions();

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));

      expect(await findByTestId('unsnooze-alert-button')).toBeInTheDocument();
    });

    it('does not offer snooze/unsnooze alert buttons when rule or instance id is missing', async () => {
      useAlertSnoozeStateMock.mockReturnValue(snoozeStateWithoutInstance);

      const { findByTestId, queryByTestId } = renderHeaderActions();

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));

      expect(queryByTestId('snooze-alert-button')).toBeNull();
      expect(queryByTestId('unsnooze-alert-button')).toBeNull();
    });
  });
});
