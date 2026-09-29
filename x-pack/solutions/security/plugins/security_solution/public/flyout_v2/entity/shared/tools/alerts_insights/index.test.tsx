/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { AlertsInsights } from '.';
import { ALERTS_INSIGHTS_TOOL_TEST_ID } from './test_ids';

const mockOpenSystemFlyout = vi.fn();

vi.mock('../../../../shared/components/tools_flyout_header', () => {
      const mocked = {
      ToolsFlyoutHeader: ({
        title,
        label,
        iconType,
        onTitleClick,
      }: {
        title: string;
        label?: string;
        iconType?: string;
        onTitleClick?: () => void;
      }) => (
        <button
          type="button"
          data-test-subj="mockToolsFlyoutHeader"
          data-title={title}
          data-label={label}
          data-icon-type={iconType}
          onClick={onTitleClick}
        />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock(
  '../../../../../cloud_security_posture/components/csp_details/alerts_findings_details_table',
  () => {
      const mocked = {
        AlertsDetailsTable: ({
          field,
          value,
          entityId,
          entityType,
          onShowAlert,
        }: {
          field: string;
          value: string;
          entityId?: string;
          entityType?: string;
          onShowAlert?: (eventId: string, indexName: string, ruleName?: string) => void;
        }) => (
          <button
            type="button"
            data-test-subj="mockAlertsDetailsTable"
            data-field={field}
            data-value={value}
            data-entity-id={entityId ?? ''}
            data-entity-type={entityType ?? ''}
            onClick={() => onShowAlert?.('event-1', '.alerts-security', 'My Alert Rule')}
          >
            {'alerts-table'}
          </button>
        ),
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock('../../../../shared/components/flyout_provider', () => {
      const mocked = {
      flyoutProviders: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../document/main/document_flyout_wrapper', () => {
      const mocked = {
      DocumentFlyoutWrapper: () => <div data-test-subj="mockDocumentFlyoutWrapper" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../shared/components/cell_actions', () => {
      const mocked = {
      cellActionRenderer: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../shared/hooks/use_default_flyout_properties', () => {
      const mocked = {
      useDefaultDocumentFlyoutProperties: () => ({ size: 'm' }),
      useDefaultToolsFlyoutProperties: () => ({ minWidth: 384, size: 'm' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/hooks/is_in_security_app', () => {
      const mocked = {
      useIsInSecurityApp: () => true,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-redux-v7', () => {
      const mocked = {
      ...require('react-redux-v7'),
      useStore: () => ({}),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useHistory: () => ({ push: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          overlays: { openSystemFlyout: mockOpenSystemFlyout },
          storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
          telemetry: { reportEvent: vi.fn() },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('<AlertsInsights /> host', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
  });

  it('renders the header with the title, host label and storage icon', () => {
    const { getByTestId } = render(<AlertsInsights entityType={EntityType.host} value="my-host" />);
    const header = getByTestId('mockToolsFlyoutHeader');
    expect(header).toHaveAttribute('data-title', 'Alerts');
    expect(header).toHaveAttribute('data-label', 'my-host');
    expect(header).toHaveAttribute('data-icon-type', 'storage');
  });

  it('renders the table inside a scrollable flyout body', () => {
    const { getByTestId } = render(<AlertsInsights entityType={EntityType.host} value="my-host" />);
    const body = getByTestId(ALERTS_INSIGHTS_TOOL_TEST_ID);
    expect(body).toBeInTheDocument();
    expect(body).toContainElement(getByTestId('mockAlertsDetailsTable'));
  });

  it('forwards the host name and entity id to the alerts table', () => {
    const { getByTestId } = render(
      <AlertsInsights entityType={EntityType.host} value="my-host" entityId="euid-123" />
    );
    const table = getByTestId('mockAlertsDetailsTable');
    expect(table).toHaveAttribute('data-field', 'host.name');
    expect(table).toHaveAttribute('data-value', 'my-host');
    expect(table).toHaveAttribute('data-entity-id', 'euid-123');
    expect(table).toHaveAttribute('data-entity-type', 'host');
  });

  it('forwards onShowEntity to the header click handler', () => {
    const onShowEntity = vi.fn();
    const { getByTestId } = render(
      <AlertsInsights entityType={EntityType.host} value="my-host" onShowEntity={onShowEntity} />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onShowEntity).toHaveBeenCalledTimes(1);
  });

  it('opens a child system flyout when an alert row is expanded', () => {
    const { getByTestId } = render(<AlertsInsights entityType={EntityType.host} value="my-host" />);
    getByTestId('mockAlertsDetailsTable').click();
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'inherit', title: 'Alert: My Alert Rule' })
    );
  });
});

describe('<AlertsInsights /> user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with the user label and user icon', () => {
    const { getByTestId } = render(<AlertsInsights entityType={EntityType.user} value="my-user" />);
    const header = getByTestId('mockToolsFlyoutHeader');
    expect(header).toHaveAttribute('data-label', 'my-user');
    expect(header).toHaveAttribute('data-icon-type', 'user');
  });

  it('forwards the user name and entity type to the alerts table', () => {
    const { getByTestId } = render(
      <AlertsInsights entityType={EntityType.user} value="my-user" entityId="euid-456" />
    );
    const table = getByTestId('mockAlertsDetailsTable');
    expect(table).toHaveAttribute('data-field', 'user.name');
    expect(table).toHaveAttribute('data-value', 'my-user');
    expect(table).toHaveAttribute('data-entity-id', 'euid-456');
    expect(table).toHaveAttribute('data-entity-type', 'user');
  });
});
