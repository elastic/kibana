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
import { RiskInputs } from '.';
import { RISK_INPUTS_TOOL_TEST_ID } from './test_ids';

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
  '../../../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab',
  () => {
      const mocked = {
        RiskInputsTab: ({
          entityType,
          entityName,
          entityId,
          onShowAlert,
        }: {
          entityType: string;
          entityName: string;
          entityId?: string;
          onShowAlert?: (id: string, indexName: string) => void;
        }) => (
          <button
            type="button"
            data-test-subj="mockRiskInputsTab"
            data-entity-type={entityType}
            data-entity-name={entityName}
            data-entity-id={entityId ?? ''}
            onClick={() => onShowAlert?.('alert-1', '.alerts-security')}
          />
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

describe('<RiskInputs /> host', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
  });

  it('renders with storage icon and host entity type', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.host} entityName="my-host" />
    );
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-title', 'Risk score');
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-label', 'my-host');
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-icon-type', 'storage');
  });

  it('renders the host risk inputs body container', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.host} entityName="my-host" />
    );
    expect(getByTestId(RISK_INPUTS_TOOL_TEST_ID)).toBeInTheDocument();
  });

  it('passes host entity context to RiskInputsTab', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.host} entityName="my-host" entityId="euid-123" />
    );
    const tab = getByTestId('mockRiskInputsTab');
    expect(tab).toHaveAttribute('data-entity-type', 'host');
    expect(tab).toHaveAttribute('data-entity-name', 'my-host');
    expect(tab).toHaveAttribute('data-entity-id', 'euid-123');
  });

  it('forwards onShowEntity to the header click handler for host', () => {
    const onShowEntity = vi.fn();
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.host} entityName="my-host" onShowEntity={onShowEntity} />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onShowEntity).toHaveBeenCalledTimes(1);
  });

  it('opens a child system flyout when a risk-input alert is expanded', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.host} entityName="my-host" />
    );
    getByTestId('mockRiskInputsTab').click();
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: 'inherit' })
    );
  });
});

describe('<RiskInputs /> user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with user icon and user entity type', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.user} entityName="my-user" />
    );
    expect(getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-icon-type', 'user');
  });

  it('renders the user risk inputs body container', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.user} entityName="my-user" />
    );
    expect(getByTestId(RISK_INPUTS_TOOL_TEST_ID)).toBeInTheDocument();
  });

  it('passes user entity context to RiskInputsTab', () => {
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.user} entityName="my-user" entityId="euid-456" />
    );
    const tab = getByTestId('mockRiskInputsTab');
    expect(tab).toHaveAttribute('data-entity-type', 'user');
    expect(tab).toHaveAttribute('data-entity-name', 'my-user');
    expect(tab).toHaveAttribute('data-entity-id', 'euid-456');
  });

  it('forwards onShowEntity to the header click handler for user', () => {
    const onShowEntity = vi.fn();
    const { getByTestId } = render(
      <RiskInputs entityType={EntityType.user} entityName="my-user" onShowEntity={onShowEntity} />
    );
    getByTestId('mockToolsFlyoutHeader').click();
    expect(onShowEntity).toHaveBeenCalledTimes(1);
  });
});
