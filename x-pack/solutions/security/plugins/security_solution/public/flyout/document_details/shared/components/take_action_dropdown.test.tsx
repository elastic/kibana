/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { set } from '@kbn/safer-lodash-set';
import { waitFor } from '@testing-library/react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { SearchHit } from '../../../../../common/search_strategy';
import type { TakeActionDropdownProps } from './take_action_dropdown';
import { TakeActionDropdown } from './take_action_dropdown';
import { mockAlertDetailsData } from '../../../../common/components/event_details/mocks';
import { getDetectionAlertMock } from '../../../../common/mock/mock_detection_alerts';
import { TimelineId } from '../../../../../common/types/timeline';
import { TestProviders } from '../../../../common/mock';
import { mockTimelines } from '../../../../common/mock/mock_timelines_plugin';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { useHttp, useKibana } from '../../../../common/lib/kibana';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { initialUserPrivilegesState as mockInitialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';
import { allCasesPermissions } from '../../../../cases_test_utils';
import {
  ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE,
  ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE,
} from '../../../../common/components/toolbar/bulk_actions/translations';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from './test_ids';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';

vi.mock('../../../../common/components/endpoint/host_isolation');
vi.mock('../../../../common/components/endpoint/responder');
vi.mock('../../../../common/components/user_privileges');
vi.mock('../../../../exceptions/hooks/use_endpoint_exceptions_capability');

const mockUseRunAlertWorkflowPanel = vi.fn().mockReturnValue({
  runWorkflowMenuItem: [],
  runAlertWorkflowPanel: [],
});
vi.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_run_alert_workflow_panel',
  () => {
      const mocked = {
        useRunAlertWorkflowPanel: (...args: unknown[]) => mockUseRunAlertWorkflowPanel(...args),
      };
      return { ...mocked, default: mocked };
    }
);

const mockUseRunDocumentWorkflowPanel = vi.fn().mockReturnValue({
  runWorkflowMenuItem: [],
  runDocumentWorkflowPanel: [],
});
vi.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_run_document_workflow_panel',
  () => {
      const mocked = {
        useRunDocumentWorkflowPanel: (...args: unknown[]) => mockUseRunDocumentWorkflowPanel(...args),
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock('../../../../detections/components/user_info', () => {
      const mocked = {
      useUserData: vi.fn().mockReturnValue([{ hasIndexWrite: true }]),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/lib/kibana');

vi.mock(
  '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges',
  () => {
      const mocked = {
        useAlertsPrivileges: vi.fn().mockReturnValue({ hasAlertsUpdate: true, hasIndexWrite: true }),
      };
      return { ...mocked, default: mocked };
    }
);
vi.mock('../../../../cases/components/use_insert_timeline');

vi.mock('../../../../common/hooks/use_app_toasts', () => {
      const mocked = {
      useAppToasts: vi.fn().mockReturnValue({
        addError: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/hooks/use_license', () => {
      const mocked = {
      useLicense: vi.fn().mockReturnValue({ isPlatinumPlus: () => true, isEnterprise: () => false }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock(
  '../../../../common/components/endpoint/host_isolation/from_alerts/use_host_isolation_status',
  () => {
    return {
      useEndpointHostIsolationStatus: vi.fn().mockReturnValue({
        loading: false,
        isIsolated: false,
        agentStatus: 'healthy',
      }),
    };
  }
);

describe('take action dropdown', () => {
  let defaultProps: TakeActionDropdownProps;
  let mockStartServicesMock: ReturnType<typeof createStartServicesMock>;

  beforeEach(() => {
    defaultProps = {
      dataFormattedForFieldBrowser: mockAlertDetailsData as TimelineEventsDetailsItem[],
      dataAsNestedObject: getDetectionAlertMock(),
      handleOnEventClosed: vi.fn(),
      onAddEventFilterClick: vi.fn(),
      onAddExceptionTypeClick: vi.fn(),
      onAddIsolationStatusClick: vi.fn(),
      refetch: vi.fn(),
      refetchFlyoutData: vi.fn(),
      scopeId: TimelineId.active,
      onOsqueryClick: vi.fn(),
      searchHit: { _index: 'test-index', _id: 'test-id' } as SearchHit,
    };

    mockStartServicesMock = createStartServicesMock();

    (useKibana as Mock).mockImplementation(() => {
      return {
        services: {
          ...mockStartServicesMock,
          timelines: { ...mockTimelines },
          cases: {
            ...mockCasesContract(),
            helpers: {
              canUseCases: vi.fn().mockReturnValue(allCasesPermissions()),
              getRuleIdFromEvent: () => null,
            },
          },
          osquery: {
            isOsqueryAvailable: vi.fn().mockReturnValue(true),
          },
          application: {
            capabilities: {
              [SECURITY_FEATURE_ID]: { crud_alerts: true, read_alerts: true },
              osquery: true,
            },
          },
        },
      };
    });

    (useHttp as Mock).mockReturnValue(mockStartServicesMock.http);
  });

  beforeEach(() => {
    (useUserPrivileges as Mock).mockReturnValue(getUserPrivilegesMockDefaultValue());
  });

  test('should render takeActionButton', () => {
    const wrapper = mount(
      <TestProviders>
        <TakeActionDropdown {...defaultProps} />
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="${FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}"]`).exists()
    ).toBeTruthy();
  });

  test('should render takeActionButton with correct text', () => {
    const wrapper = mount(
      <TestProviders>
        <TakeActionDropdown {...defaultProps} />
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="${FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}"]`).first().text()
    ).toEqual('Take action');
  });

  describe('should render take action items', () => {
    let wrapper: ReactWrapper;

    beforeAll(() => {
      (useUserPrivileges as Mock).mockReturnValue({
        ...getUserPrivilegesMockDefaultValue(),
        timelinePrivileges: { read: true },
        rulesPrivileges: {
          rules: { read: true, edit: true },
          exceptions: { read: true, edit: true },
        },
      });

      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );
      wrapper
        .find(`button[data-test-subj="${FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}"]`)
        .simulate('click');
    });
    test('should render "Add to case"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="add-to-case-action"]').first().text()).toEqual(
          'Add to case'
        );
      });
    });

    test('should render "mark as acknowledge"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="acknowledged-alert-status"]').first().text()).toEqual(
          'Mark as acknowledged'
        );
      });
    });

    test('should render "mark as close"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="alert-close-context-menu-item"]').first().text()
        ).toEqual('Mark as closed');
      });
    });

    test('should render "Add Endpoint exception"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="add-endpoint-exception-menu-item"]').first().text()
        ).toEqual('Add Endpoint exception');
      });
    });
    test('should render "Add rule exception"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="add-exception-menu-item"]').first().text()).toEqual(
          'Add rule exception'
        );
      });
    });

    test('should render "Isolate host"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="isolate-host-action-item"]').first().text()).toEqual(
          'Isolate host'
        );
      });
    });
    test('should render "Investigate in Timeline"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="investigate-in-timeline-action-item"]').first().text()
        ).toEqual('Investigate in Timeline');
      });
    });
    test('should render "Run Osquery"', async () => {
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="osquery-action-item"]').first().text()).toEqual(
          'Run Osquery'
        );
      });
    });
    test('should render "Respond"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="endpointResponseActions-action-item"]').first().text()
        ).toEqual('Respond');
      });
    });
    test('should render "Apply alert tags"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="alert-tags-context-menu-item"]').first().text()
        ).toEqual(ALERT_TAGS_CONTEXT_MENU_ITEM_TITLE);
      });
    });
    test('should render "Assign alert"', async () => {
      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="alert-assignees-context-menu-item"]').first().text()
        ).toEqual(ALERT_ASSIGNEES_CONTEXT_MENU_ITEM_TITLE);
      });
    });
  });

  describe('privileges', () => {
    test('should not render "Investigate in Timeline" when the user does not have timeline privileges', async () => {
      (useUserPrivileges as Mock).mockReturnValue({
        ...getUserPrivilegesMockDefaultValue(),
        timelinePrivileges: { read: false },
      });
      const wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );
      wrapper
        .find(`button[data-test-subj="${FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}"]`)
        .simulate('click');

      await waitFor(() => {
        expect(
          wrapper.exists('[data-test-subj="investigate-in-timeline-action-item"]')
        ).toBeFalsy();
      });
    });
  });

  describe('for Endpoint related actions', () => {
    /** Removes the detail data that is used to determine if data is for an Alert */
    const setAlertDetailsDataMockToEvent = () => {
      if (defaultProps.dataFormattedForFieldBrowser) {
        defaultProps.dataFormattedForFieldBrowser = defaultProps.dataFormattedForFieldBrowser
          .map((obj) => {
            if (obj.field === 'kibana.alert.rule.uuid') {
              return null;
            }
            if (obj.field === 'event.kind') {
              return {
                category: 'event',
                field: 'event.kind',
                values: ['event'],
                originalValue: 'event',
              };
            }
            return obj;
          })
          .filter((obj) => obj) as TimelineEventsDetailsItem[];
      } else {
        expect(defaultProps.dataFormattedForFieldBrowser).toBeInstanceOf(Object);
      }
    };

    const setAgentTypeOnAlertDetailsDataMock = (agentType: string = 'endpoint') => {
      if (defaultProps.dataFormattedForFieldBrowser) {
        defaultProps.dataFormattedForFieldBrowser = defaultProps.dataFormattedForFieldBrowser.map(
          (obj) => {
            if (obj.field === 'agent.type') {
              return {
                category: 'agent',
                field: 'agent.type',
                values: [agentType],
                originalValue: [agentType],
              };
            }
            if (obj.field === 'agent.id') {
              return {
                category: 'agent',
                field: 'agent.id',
                values: ['123'],
                originalValue: ['123'],
              };
            }

            return obj;
          }
        ) as TimelineEventsDetailsItem[];
      } else {
        expect(defaultProps.dataFormattedForFieldBrowser).toBeInstanceOf(Object);
      }
    };

    /** Set the `agent.type` and `agent.id` on the EcsData */
    const setTypeOnEcsDataWithAgentType = (
      agentType: string = 'endpoint',
      agentId: string = '123'
    ) => {
      if (defaultProps.dataAsNestedObject) {
        defaultProps.dataAsNestedObject.agent = {
          // @ts-expect-error Ecs definition for agent seems to be missing properties
          id: agentId,
          type: [agentType],
        };
      } else {
        expect(defaultProps.dataAsNestedObject).toBeInstanceOf(Object);
      }
    };

    let wrapper: ReactWrapper;

    const render = (): ReactWrapper => {
      wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );
      wrapper
        .find(`button[data-test-subj="${FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}"]`)
        .simulate('click');

      return wrapper;
    };

    it('should include the Isolate/Release action', () => {
      render();

      expect(wrapper.exists('[data-test-subj="isolate-host-action-item"]')).toBe(true);
    });

    it('should include the Responder action', () => {
      render();

      expect(wrapper.exists('[data-test-subj="endpointResponseActions-action-item"]')).toBe(true);
    });

    describe('"Add Endpoint exception" button', () => {
      const mockUseEndpointExceptionsCapability = useEndpointExceptionsCapability as Mock;

      beforeEach(() => {
        (useUserPrivileges as Mock).mockReturnValue(
          getUserPrivilegesMockDefaultValue({
            rulesPrivileges: {
              ...getUserPrivilegesMockDefaultValue().rulesPrivileges,
              rules: { read: true, edit: true },
              exceptions: { read: true, edit: true },
            },
          })
        );
      });

      test('should enable the "Add Endpoint exception" button if provided endpoint alert and has right privileges', async () => {
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.kind', ['alert']);
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.module', ['endpoint']);
        mockUseEndpointExceptionsCapability.mockReturnValue(true);

        render();

        await waitFor(() => {
          expect(
            wrapper.find('[data-test-subj="add-endpoint-exception-menu-item"]').last().getDOMNode()
          ).toBeEnabled();
        });
      });

      test('should disable the "Add Endpoint exception" button if user has no endpoint exception write privilege', async () => {
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.kind', ['alert']);
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.module', ['endpoint']);
        mockUseEndpointExceptionsCapability.mockReturnValue(false);

        render();

        await waitFor(() => {
          expect(
            wrapper.find('[data-test-subj="add-endpoint-exception-menu-item"]').last().getDOMNode()
          ).toBeDisabled();
        });
      });

      test('should disable the "Add Endpoint exception" button if event kind is not alert', async () => {
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.kind', ['event']);
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.module', ['endpoint']);
        mockUseEndpointExceptionsCapability.mockReturnValue(true);

        render();

        await waitFor(() => {
          expect(
            wrapper.find('[data-test-subj="add-endpoint-exception-menu-item"]').last().getDOMNode()
          ).toBeDisabled();
        });
      });

      test('should disable the "Add Endpoint exception" button if module is not endpoint', async () => {
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.kind', ['alert']);
        set(defaultProps.dataAsNestedObject, 'kibana.alert.original_event.module', ['filebeat']);
        mockUseEndpointExceptionsCapability.mockReturnValue(true);

        render();

        await waitFor(() => {
          expect(
            wrapper.find('[data-test-subj="add-endpoint-exception-menu-item"]').last().getDOMNode()
          ).toBeDisabled();
        });
      });
    });

    describe('should correctly enable/disable the "Add Endpoint event filter" button', () => {
      beforeEach(() => {
        setTypeOnEcsDataWithAgentType();
        setAlertDetailsDataMockToEvent();
      });

      test('should enable the "Add Endpoint event filter" button if provided endpoint event and has right privileges', async () => {
        (useUserPrivileges as Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canWriteEventFilters: true },
        });
        render();
        await waitFor(() => {
          expect(
            wrapper.find('[data-test-subj="add-event-filter-menu-item"]').last().getDOMNode()
          ).toBeEnabled();
        });
      });

      test('should hide the "Add Endpoint event filter" button if no write event filters privileges', async () => {
        (useUserPrivileges as Mock).mockReturnValue({
          ...mockInitialUserPrivilegesState(),
          endpointPrivileges: { loading: false, canWriteEventFilters: false },
        });
        render();
        await waitFor(() => {
          expect(wrapper.exists('[data-test-subj="add-event-filter-menu-item"]')).toBeFalsy();
        });
      });

      test('should hide the "Add Endpoint event filter" button if provided no event from endpoint', async () => {
        setAgentTypeOnAlertDetailsDataMock('filebeat');
        setTypeOnEcsDataWithAgentType('filebeat');
        render();
        await waitFor(() => {
          expect(wrapper.exists('[data-test-subj="add-event-filter-menu-item"]')).toBeFalsy();
        });
      });
    });
  });

  describe('searchHit prop', () => {
    it('should pass searchHit._source fields to the document workflow panel', () => {
      const searchHit = {
        _id: 'alert-123',
        _index: 'alerts-index',
        _source: { 'host.name': 'my-host', 'agent.type': 'endpoint' },
      };

      mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} searchHit={searchHit} />
        </TestProviders>
      );

      expect(mockUseRunDocumentWorkflowPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          documents: [
            expect.objectContaining({
              _id: defaultProps.dataAsNestedObject._id,
              'host.name': 'my-host',
              'agent.type': 'endpoint',
            }),
          ],
        })
      );
    });

    it('should pass empty source fields when searchHit is undefined', () => {
      mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );

      expect(mockUseRunDocumentWorkflowPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          documents: [
            expect.objectContaining({
              _id: defaultProps.dataAsNestedObject._id,
            }),
          ],
        })
      );
    });
  });

  describe('remote document', () => {
    let remoteProps: TakeActionDropdownProps;

    beforeEach(() => {
      // Timeline read privilege is required so investigateInTimelineActionItems is non-empty,
      // which allows the dropdown to render for remote documents (only that item is shown).
      (useUserPrivileges as Mock).mockReturnValue({
        ...getUserPrivilegesMockDefaultValue(),
        timelinePrivileges: { read: true },
      });

      remoteProps = {
        ...defaultProps,
        dataAsNestedObject: {
          ...getDetectionAlertMock(),
          _index: 'remote-cluster:.alerts-security.alerts-default',
        },
        searchHit: {
          _id: 'test-id',
          _index: 'remote-cluster:.alerts-security.alerts-default',
        } as SearchHit,
      };
    });

    it('should render only "Investigate in timeline" for a remote alert', async () => {
      const wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...remoteProps} />
        </TestProviders>
      );
      wrapper
        .find(`button[data-test-subj="${FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}"]`)
        .simulate('click');

      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="investigate-in-timeline-action-item"]').exists()
        ).toBeTruthy();
        expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeFalsy();
        expect(wrapper.find('[data-test-subj="acknowledged-alert-status"]').exists()).toBeFalsy();
        expect(
          wrapper.find('[data-test-subj="alert-tags-context-menu-item"]').exists()
        ).toBeFalsy();
        expect(
          wrapper.find('[data-test-subj="alert-assignees-context-menu-item"]').exists()
        ).toBeFalsy();
      });
    });

    it('should render the full menu for a local alert', async () => {
      const wrapper = mount(
        <TestProviders>
          <TakeActionDropdown {...defaultProps} />
        </TestProviders>
      );
      wrapper
        .find(`button[data-test-subj="${FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}"]`)
        .simulate('click');

      await waitFor(() => {
        expect(
          wrapper.find('[data-test-subj="investigate-in-timeline-action-item"]').exists()
        ).toBeTruthy();
        expect(wrapper.find('[data-test-subj="add-to-case-action"]').exists()).toBeTruthy();
        expect(wrapper.find('[data-test-subj="acknowledged-alert-status"]').exists()).toBeTruthy();
      });
    });
  });
});
