/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { alertInputDataMock } from '../mocks';
import { useRiskInputActionsPanels } from './use_risk_input_actions_panels';
import { useSendBulkToTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_send_bulk_to_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EntityEventTypes } from '../../../../common/lib/telemetry';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';

const casesServiceMock = casesPluginMock.createStartContract();
const mockCanUseCases = vi.fn();

const mockedCasesServices = {
  ...casesServiceMock,
  helpers: {
    ...casesServiceMock.helpers,
    canUseCases: mockCanUseCases,
  },
};

const mockReportEvent = vi.fn();
vi.mock('../../../../common/lib/kibana/kibana_react', async () => {
  const original = (await vi.importActual('../../../../common/lib/kibana/kibana_react'));
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        cases: mockedCasesServices,
        telemetry: {
          reportEvent: mockReportEvent,
        },
      },
    }),
  };
});

vi.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_send_bulk_to_timeline'
);
vi.mock('../../../../common/components/user_privileges');
vi.mock('../../../../common/hooks/is_in_security_app');

const mockUseSendBulkToTimeline = useSendBulkToTimeline as Mock;
const mockUseUserPrivileges = useUserPrivileges as Mock;
const mockUseIsInSecurityApp = useIsInSecurityApp as Mock;

const TestMenu = ({ panels }: { panels: EuiContextMenuPanelDescriptor[] }) => (
  <EuiContextMenu initialPanelId={0} panels={panels} />
);

const customRender = (alerts = [alertInputDataMock]) => {
  const { result } = renderHook(() => useRiskInputActionsPanels(alerts, () => {}), {
    wrapper: TestProviders,
  });

  return render(
    <TestProviders>
      <TestMenu panels={result.current as unknown as EuiContextMenuPanelDescriptor[]} />
    </TestProviders>
  );
};

describe('useRiskInputActionsPanels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanUseCases.mockReturnValue({
      create: true,
      createComment: true,
      read: true,
      update: false,
    });
    mockUseSendBulkToTimeline.mockReturnValue({
      sendBulkEventsToTimelineHandler: vi.fn(),
    });
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: false },
    });
    mockUseIsInSecurityApp.mockReturnValue(true);
  });

  it('displays the rule name when only one alert is selected', () => {
    const { getByTestId } = customRender();

    expect(getByTestId('contextMenuPanelTitle')).toHaveTextContent('Risk input: Rule Name');
  });

  it('displays number of selected alerts when more than one alert is selected', () => {
    const { getByTestId } = customRender([alertInputDataMock, alertInputDataMock]);

    expect(getByTestId('contextMenuPanelTitle')).toHaveTextContent('2 selected');
  });

  it('displays the singular case action when user has cases permissions', () => {
    const { getByTestId } = customRender();

    expect(getByTestId('add-to-case')).toHaveTextContent('Add to case');
  });

  it('keeps action order, icons, and the explicit group separator visible', () => {
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: true },
    });
    const { getAllByRole, getByTestId } = customRender();

    expect(getAllByRole('menuitem').map(({ textContent }) => textContent)).toEqual([
      'Add to case',
      'Add to new timeline',
    ]);
    expect(getByTestId('securityActionMenuGroupSeparator')).toBeInTheDocument();
    expect(
      getByTestId('add-to-new-timeline').querySelector('[data-euiicon-type="timeline"]')
    ).not.toBeNull();
    expect(
      getByTestId('add-to-case').querySelector('[data-euiicon-type="briefcase"]')
    ).not.toBeNull();
  });

  it('does NOT display cases actions when user has NO cases permissions', () => {
    mockCanUseCases.mockReturnValue({
      create: false,
      createComment: false,
      read: false,
      update: false,
    });

    const { container } = customRender();

    expect(container).not.toHaveTextContent('Add to case');
  });

  it('displays the timeline action when user has sufficient privileges', () => {
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: true },
    });

    const { container } = customRender();

    expect(container).toHaveTextContent('Add to new timeline');
  });

  it('does NOT display the timeline action when user has insufficient privileges', () => {
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: false },
    });

    const { container } = customRender();

    expect(container).not.toHaveTextContent('Add to new timeline');
  });

  it('calls sendBulkEventsToTimelineHandler when timeline action is clicked', () => {
    const mockSendBulkEvents = vi.fn();
    mockUseSendBulkToTimeline.mockReturnValue({
      sendBulkEventsToTimelineHandler: mockSendBulkEvents,
    });
    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { read: true },
    });

    const closePopover = vi.fn();
    const { result } = renderHook(
      () => useRiskInputActionsPanels([alertInputDataMock], closePopover),
      {
        wrapper: TestProviders,
      }
    );

    const timelineAction = result.current[0].items?.find(
      ({ key }) => key === 'add-to-new-timeline'
    );

    if (timelineAction && 'onClick' in timelineAction) {
      timelineAction.onClick?.({} as React.MouseEvent<HTMLHRElement>);
    }

    expect(mockSendBulkEvents).toHaveBeenCalledWith([
      {
        _id: alertInputDataMock.input.id,
        _index: alertInputDataMock.input.index,
        data: [],
        ecs: {
          _id: alertInputDataMock.input.id,
          _index: alertInputDataMock.input.index,
        },
      },
    ]);
    expect(closePopover).toHaveBeenCalled();
    expect(mockReportEvent).toHaveBeenCalledWith(EntityEventTypes.AddRiskInputToTimelineClicked, {
      quantity: 1,
    });
  });
});
