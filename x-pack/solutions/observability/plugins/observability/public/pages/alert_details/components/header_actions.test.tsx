/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
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

vi.mock('../../../utils/kibana_react');
vi.mock('../../../hooks/use_fetch_rule');
vi.mock('../hooks/use_alert_snooze_state');
vi.mock('../../../hooks/use_investigate_alert', () => {
      const mocked = {
      useInvestigateAlert: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alert_field_names', () => {
      const mocked = {
      useAlertFieldNames: () => ({ fieldNames: [], isLoading: false }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/response-ops-alert-snooze', () => {
      const mocked = {
      useAlertSnooze: vi.fn(),
      AlertSnoozePanelInline: vi.fn(({ onApply, onBack }) => (
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
    };
      return { ...mocked, default: mocked };
    });

const mockUseGetRuleTypesPermissions = vi.fn(() => ({
  authorizedToReadRuleType: (): boolean => true,
}));
vi.mock('@kbn/alerts-ui-shared/src/common/hooks', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/alerts-ui-shared/src/common/hooks')),
      useGetRuleTypesPermissions: () => mockUseGetRuleTypesPermissions(),
    };
      return { ...mocked, default: mocked };
    });

const useKibanaMock = useKibana as Mock;
const useFetchRuleMock = useFetchRule as Mock;
const useAlertSnoozeStateMock = useAlertSnoozeState as Mock;
const useAlertSnoozeMock = useAlertSnooze as Mock;
const useInvestigateAlertMock = useInvestigateAlert as Mock;
const mockCases = casesPluginMock.createStartContract();

const mockHttp = {
  post: vi.fn(),
  basePath: {
    prepend: (url: string) => `wow${url}`,
  },
};

const mockNavigateToApp = {
  mockNavigateToApp: vi.fn(),
  capabilities: { agentBuilder: { write: true } },
};

vi.mock('@kbn/response-ops-rule-form/flyout', () => {
      const mocked = {
      RuleFormFlyout: vi.fn(() => <div data-test-subj="edit-rule-flyout">mocked component</div>),
    };
      return { ...mocked, default: mocked };
    });

const mockKibana = () => {
  mockCases.helpers.canUseCases = vi.fn().mockReturnValue(allCasesPermissions());
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
    reloadRule: vi.fn(),
    rule: {
      id: mockRuleId,
      name: mockRuleName,
    },
  });
};
const mockUseFetchRuleWithoutData = () => {
  useFetchRuleMock.mockReturnValue({
    reloadRule: vi.fn(),
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
  refetch: vi.fn(),
  isLoading: false,
};

describe('Header Actions', () => {
  beforeEach(() => {
    useInvestigateAlertMock.mockReturnValue({
      showInvestigateAction: true,
      handleInvestigate: vi.fn(),
      isInvestigating: false,
      investigateActionLabel: 'Investigate',
      viewInvestigationUrl: '/app/nightshift?investigationId=investigation-1',
      viewInvestigationActionLabel: 'View investigation',
    });
    useAlertSnoozeStateMock.mockReturnValue(snoozeStateWithoutInstance);
    useAlertSnoozeMock.mockReturnValue({
      snoozeAlert: vi.fn().mockResolvedValue(true),
      unsnoozeAlert: vi.fn().mockResolvedValue(true),
    });
  });

  afterAll(() => {
    vi.clearAllMocks();
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

      const useCasesAddToExistingCaseModalMock: any = vi.fn().mockImplementation(() => ({
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
          refetch={vi.fn()}
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

    it('starts an investigation from the alert details menu', async () => {
      const handleInvestigate = vi.fn();
      useInvestigateAlertMock.mockReturnValue({
        showInvestigateAction: true,
        handleInvestigate,
        isInvestigating: false,
        investigateActionLabel: 'Investigate',
      });
      const { findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex="alert-index"
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={vi.fn()}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      fireEvent.click(await findByTestId('alertDetailsInvestigate'));

      expect(handleInvestigate).toHaveBeenCalled();
    });

    it('links to a completed investigation from the alert details menu', async () => {
      const { findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex="alert-index"
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={vi.fn()}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));

      expect(await findByTestId('alertDetailsViewInvestigation')).toHaveAttribute(
        'href',
        '/app/nightshift?investigationId=investigation-1'
      );
    });

    it('hides the view action when the alert has no completed investigation', async () => {
      useInvestigateAlertMock.mockReturnValue({
        showInvestigateAction: true,
        handleInvestigate: vi.fn(),
        isInvestigating: false,
        investigateActionLabel: 'Investigate',
        viewInvestigationUrl: undefined,
        viewInvestigationActionLabel: 'View investigation',
      });
      const { findByTestId, queryByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex="alert-index"
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={vi.fn()}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('alertDetailsViewInvestigation')).not.toBeInTheDocument();
    });

    it('hides the investigate action when no investigation connector is available', async () => {
      useInvestigateAlertMock.mockReturnValue({
        showInvestigateAction: false,
        handleInvestigate: vi.fn(),
        isInvestigating: false,
        investigateActionLabel: 'Investigate',
      });
      const { findByTestId, queryByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex="alert-index"
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={vi.fn()}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(queryByTestId('alertDetailsInvestigate')).not.toBeInTheDocument();
    });

    it('disables the investigate action while the request is in flight', async () => {
      useInvestigateAlertMock.mockReturnValue({
        showInvestigateAction: true,
        handleInvestigate: vi.fn(),
        isInvestigating: true,
        investigateActionLabel: 'Investigating',
      });
      const { findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex="alert-index"
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={vi.fn()}
        />
      );

      fireEvent.click(await findByTestId('alert-details-header-actions-menu-button'));
      expect(await findByTestId('alertDetailsInvestigate')).toBeDisabled();
    });

    it('should NOT offer an "Add to case" button without cases privileges', async () => {
      mockCases.helpers.canUseCases = vi.fn().mockReturnValue(noCasesPermissions());

      const { queryByTestId, findByTestId } = render(
        <HeaderActions
          alert={alertWithGroupsAndTags}
          alertIndex={'alert-index'}
          alertStatus={alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus}
          onUntrackAlert={mockOnUntrackAlert}
          refetch={vi.fn()}
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
          refetch={vi.fn()}
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
          refetch={vi.fn()}
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
            refetch={vi.fn()}
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
            refetch={vi.fn()}
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
            refetch={vi.fn()}
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
            refetch={vi.fn()}
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
            refetch={vi.fn()}
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
          refetch={vi.fn()}
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
          refetch={vi.fn()}
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
          refetch={vi.fn()}
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
      refetch: vi.fn(),
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
          refetch={vi.fn()}
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
      const snoozeAlert = vi.fn().mockResolvedValue(true);
      useAlertSnoozeMock.mockReturnValue({ snoozeAlert, unsnoozeAlert: vi.fn() });
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
      const unsnoozeAlert = vi.fn().mockResolvedValue(true);
      useAlertSnoozeMock.mockReturnValue({ snoozeAlert: vi.fn(), unsnoozeAlert });
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
