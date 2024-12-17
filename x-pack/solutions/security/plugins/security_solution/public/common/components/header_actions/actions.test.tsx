/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { mockTimelineData, mockTimelineModel, TestProviders } from '../../mock';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { licenseService } from '../../hooks/use_license';
import { TableId } from '@kbn/securitysolution-data-table';
import { useTourContext } from '../guided_onboarding_tour';
import { GuidedOnboardingTourStep, SecurityTourStep } from '../guided_onboarding_tour/tour_step';
import { SecurityStepId } from '../guided_onboarding_tour/tour_config';
import { Actions } from './actions';
import { initialUserPrivilegesState as mockInitialUserPrivilegesState } from '../user_privileges/user_privileges_context';
import { useUserPrivileges } from '../user_privileges';
import { useHiddenByFlyout } from '../guided_onboarding_tour/use_hidden_by_flyout';

const useHiddenByFlyoutMock = useHiddenByFlyout as jest.Mock;
jest.mock('../guided_onboarding_tour/use_hidden_by_flyout', () => ({
  useHiddenByFlyout: jest.fn(),
}));
jest.mock('../guided_onboarding_tour');
jest.mock('../user_privileges');
jest.mock('../user_privileges');
jest.mock('../../../detections/components/user_info', () => ({
  useUserData: jest.fn().mockReturnValue([{ canUserCRUD: true, hasIndexWrite: true }]),
}));
jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../hooks/use_selector');
jest.mock(
  '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline',
  () => ({
    useInvestigateInTimeline: jest.fn().mockReturnValue({
      investigateInTimelineActionItems: [],
      investigateInTimelineAlertClick: jest.fn(),
      showInvestigateInTimelineAction: false,
    }),
  })
);

const mockUseUiSetting = jest.fn().mockReturnValue([true]);
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useUiSetting$: () => mockUseUiSetting(),
  };
});

jest.mock('./add_note_icon_item', () => {
  return {
    AddEventNoteAction: jest.fn(() => <div data-test-subj="add-note-mock-action" />),
  };
});

jest.mock('../../lib/kibana', () => {
  const originalKibanaLib = jest.requireActual('../../lib/kibana');

  return {
    ...originalKibanaLib,
    useKibana: () => ({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(),
          capabilities: {
            siem: { crud_alerts: true, read_alerts: true },
          },
        },
        cases: mockCasesContract(),
        uiSettings: {
          get: jest.fn(),
        },
        savedObjects: {
          client: {},
        },
      },
    }),
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
    useNavigateTo: jest.fn().mockReturnValue({
      navigateTo: jest.fn(),
    }),
  };
});

jest.mock('../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(() => false),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const defaultProps = {
  ariaRowindex: 2,
  checked: false,
  columnId: '',
  columnValues: 'abc def',
  disableExpandAction: false,
  data: mockTimelineData[0].data,
  ecsData: mockTimelineData[0].ecs,
  eventId: 'abc',
  eventIdToNoteIds: {},
  index: 2,
  isEventPinned: false,
  loadingEventIds: [],
  onEventDetailsPanelOpened: () => {},
  onRowSelected: () => {},
  refetch: () => {},
  rowIndex: 10,
  setEventsDeleted: () => {},
  setEventsLoading: () => {},
  showCheckboxes: true,
  showNotes: false,
  timelineId: 'test',
  toggleShowNotes: () => {},
};

describe('Actions', () => {
  beforeAll(() => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 1,
      incrementStep: () => null,
      isTourShown: () => false,
    });
    (useShallowEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
  });

  describe('Guided Onboarding Step', () => {
    const incrementStepMock = jest.fn();
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
      (useTourContext as jest.Mock).mockReturnValue({
        activeStep: 2,
        incrementStep: incrementStepMock,
        isTourShown: () => true,
      });
      jest.clearAllMocks();
    });

    const ecsData = {
      ...mockTimelineData[0].ecs,
      kibana: { alert: { rule: { uuid: ['123'], parameters: {} } } },
    };
    const isTourAnchorConditions: { [key: string]: unknown } = {
      ecsData,
      timelineId: TableId.alertsOnAlertsPage,
      ariaRowindex: 1,
    };

    test('if isTourShown is false [isTourAnchor=false], SecurityTourStep is not active', () => {
      (useTourContext as jest.Mock).mockReturnValue({
        activeStep: 2,
        incrementStep: jest.fn(),
        isTourShown: () => false,
      });

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} {...isTourAnchorConditions} />
        </TestProviders>
      );

      expect(wrapper.find(GuidedOnboardingTourStep).exists()).toEqual(true);
      expect(wrapper.find(SecurityTourStep).exists()).toEqual(false);
    });

    test('if all conditions make isTourAnchor=true, SecurityTourStep is active', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} {...isTourAnchorConditions} />
        </TestProviders>
      );

      expect(wrapper.find(GuidedOnboardingTourStep).exists()).toEqual(true);
      expect(wrapper.find(SecurityTourStep).exists()).toEqual(true);
    });

    test('if left expandable flyout is expanded, SecurityTourStep not active', () => {
      useHiddenByFlyoutMock.mockReturnValue(true);

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} {...isTourAnchorConditions} />
        </TestProviders>
      );

      expect(wrapper.find(GuidedOnboardingTourStep).exists()).toEqual(true);
      expect(wrapper.find(SecurityTourStep).exists()).toEqual(false);
    });

    test('on expand event click and SecurityTourStep is active, incrementStep', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} {...isTourAnchorConditions} />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="expand-event"]').first().simulate('click');

      expect(incrementStepMock).toHaveBeenCalledWith(SecurityStepId.alertsCases);
    });

    test('on expand event click and SecurityTourStep is active, but step is not 2, do not incrementStep', () => {
      (useTourContext as jest.Mock).mockReturnValue({
        activeStep: 1,
        incrementStep: incrementStepMock,
        isTourShown: () => true,
      });

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} {...isTourAnchorConditions} />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="expand-event"]').first().simulate('click');

      expect(incrementStepMock).not.toHaveBeenCalled();
    });

    test('on expand event click and SecurityTourStep is not active, do not incrementStep', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="expand-event"]').first().simulate('click');

      expect(incrementStepMock).not.toHaveBeenCalled();
    });

    test('if isTourAnchor=false, SecurityTourStep is not active', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find(GuidedOnboardingTourStep).exists()).toEqual(true);
      expect(wrapper.find(SecurityTourStep).exists()).toEqual(false);
    });

    describe.each(Object.keys(isTourAnchorConditions))('tour condition true: %s', (key: string) => {
      it('Single condition does not make tour step exist', () => {
        const wrapper = mount(
          <TestProviders>
            <Actions {...defaultProps} {...{ [key]: isTourAnchorConditions[key] }} />
          </TestProviders>
        );

        expect(wrapper.find(GuidedOnboardingTourStep).exists()).toEqual(true);
        expect(wrapper.find(SecurityTourStep).exists()).toEqual(false);
      });
    });
  });

  describe('Alert context menu enabled?', () => {
    beforeEach(() => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...mockInitialUserPrivilegesState(),
        endpointPrivileges: { loading: false, canWriteEventFilters: true },
      });
    });
    test('it disables for eventType=raw', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(true);
    });

    test('it enables for eventType=signal', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        kibana: { alert: { rule: { uuid: ['123'], parameters: {} } } },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(false);
    });

    test('it disables for event.kind: undefined and agent.type: endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        agent: { type: ['endpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(true);
    });

    test('it enables for event.kind: event and agent.type: endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['event'] },
        agent: { type: ['endpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(false);
    });

    test('it disables for event.kind: alert and agent.type: endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(
        wrapper.find('[data-test-subj="timeline-context-menu-button"]').first().prop('isDisabled')
      ).toBe(true);
    });

    test('it shows the analyze event button when the event is from an endpoint', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entity_id: ['1'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="view-in-analyzer"]').exists()).toBe(true);
    });

    test('it does not render the analyze event button when the event is from an unsupported source', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['notendpoint'] },
      };
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="view-in-analyzer"]').exists()).toBe(false);
    });

    test('it does not render the analyze event button on the cases alerts table with advanced settings disabled', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entity_id: ['1'] },
      };
      mockUseUiSetting.mockReturnValue([false]);

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} timelineId={TableId.alertsOnCasePage} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="view-in-analyzer"]').exists()).toBe(false);
    });

    test('it does render the analyze event button on the cases alerts table with advanced settings enabled', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entity_id: ['1'] },
      };
      mockUseUiSetting.mockReturnValue([true]);

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} timelineId={TableId.alertsOnCasePage} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="view-in-analyzer"]').exists()).toBe(true);
    });

    test('it does render the analyze event button on the alerts page alerts table even with advanced settings disabled', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entity_id: ['1'] },
      };
      mockUseUiSetting.mockReturnValue([false]);

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} timelineId={TableId.alertsOnAlertsPage} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="view-in-analyzer"]').exists()).toBe(true);
    });

    test('it should not show session view button on action tabs for basic users', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'], start: ['2022-05-08T13:44:00.13Z'] } },
        _index: '.ds-logs-endpoint.events.process-default',
      };

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toEqual(false);
    });

    test('it should show session view button on action tabs when user access the session viewer via K8S dashboard', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'], start: ['2022-05-08T13:44:00.13Z'] } },
        _index: '.ds-logs-endpoint.events.process-default',
      };

      const wrapper = mount(
        <TestProviders>
          <Actions
            {...defaultProps}
            ecsData={ecsData}
            timelineId={TableId.kubernetesPageSessions}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toEqual(true);
    });

    test('it should show session view button on action tabs for enterprise users', () => {
      const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

      licenseServiceMock.isEnterprise.mockReturnValue(true);

      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'], start: ['2022-05-08T13:44:00.13Z'] } },
        _index: '.ds-logs-endpoint.events.process-default',
      };

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toEqual(true);
    });

    test('it does not render the session view button on the cases alerts table with advanced settings disabled', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'], start: ['2022-05-08T13:44:00.13Z'] } },
        _index: '.ds-logs-endpoint.events.process-default',
      };
      mockUseUiSetting.mockReturnValue([false]);

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} timelineId={TableId.alertsOnCasePage} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toBe(false);
    });

    test('it does render the session view button on the cases alerts table with advanced settings enabled', () => {
      const ecsData = {
        ...mockTimelineData[0].ecs,
        event: { kind: ['alert'] },
        agent: { type: ['endpoint'] },
        process: { entry_leader: { entity_id: ['test_id'], start: ['2022-05-08T13:44:00.13Z'] } },
        _index: '.ds-logs-endpoint.events.process-default',
      };
      mockUseUiSetting.mockReturnValue([true]);

      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} ecsData={ecsData} timelineId={TableId.alertsOnCasePage} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="session-view-button"]').exists()).toBe(true);
    });
  });

  describe('Show notes action', () => {
    test('should show notes action if showNotes is true', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} showNotes={true} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="add-note-mock-action"]').exists()).toBeTruthy();
    });

    test('should NOT show notes action if showNotes is false', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} showNotes={false} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="add-note-mock-action"]').exists()).toBeFalsy();
    });
  });

  describe('Expand action', () => {
    test('should not be visible if disableExpandAction is true', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} disableExpandAction />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="expand-event"]').exists()).toBeFalsy();
    });
  });

  describe('Pin action', () => {
    test('should hide pin Action by default', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} disableExpandAction />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="pin-event"]').exists()).toBeFalsy();
    });

    test('should show pin Action by when disablePinAction = false', () => {
      const wrapper = mount(
        <TestProviders>
          <Actions {...defaultProps} disableExpandAction disablePinAction={false} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="pin-event"]').exists()).toBeTruthy();
    });
  });
});
