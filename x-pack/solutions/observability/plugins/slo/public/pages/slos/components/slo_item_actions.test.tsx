/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { buildSlo } from '../../../data/slo/slo';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useActionModal } from '../../../context/action_modal';
import { SloItemActions } from './slo_item_actions';

jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_permissions');
jest.mock('../../../hooks/use_plugin_context');
jest.mock('../../../context/action_modal');

const useKibanaMock = useKibana as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const usePluginContextMock = usePluginContext as jest.Mock;
const useActionModalMock = useActionModal as jest.Mock;

const mockTriggerAction = jest.fn();
const mockNavigateToUrl = jest.fn();
const telemetryMock = {
  reportSloEdited: jest.fn(),
  reportSloDeleted: jest.fn(),
  reportSloCloned: jest.fn(),
  reportSloReset: jest.fn(),
};

function renderWithIntl(children: React.ReactNode) {
  return render(<IntlProvider locale="en">{children}</IntlProvider>);
}

describe('SloItemActions', () => {
  const slo = buildSlo({ id: 'slo-1234' });

  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: {
        application: { navigateToUrl: mockNavigateToUrl },
        executionContext: { get: () => ({ name: 'not-dashboards' }) },
        share: { url: { locators: { get: () => undefined } } },
        http: { basePath: { prepend: (path: string) => path, get: () => '' } },
      },
    });

    usePermissionsMock.mockReturnValue({
      data: { hasAllWriteRequested: true, hasAllReadRequested: true },
    });

    usePluginContextMock.mockReturnValue({ telemetry: telemetryMock });

    useActionModalMock.mockReturnValue({ triggerAction: mockTriggerAction });
  });

  function openActionsMenu() {
    const { getByTestId } = renderWithIntl(
      <SloItemActions
        slo={slo}
        isActionsPopoverOpen={true}
        setIsActionsPopoverOpen={() => {}}
        setIsAddRuleFlyoutOpen={() => {}}
        setIsEditRuleFlyoutOpen={() => {}}
      />
    );
    return { getByTestId };
  }

  it('reports slo_edited when the edit action is clicked', () => {
    const { getByTestId } = openActionsMenu();

    fireEvent.click(getByTestId('sloActionsEdit'));

    expect(telemetryMock.reportSloEdited).toHaveBeenCalledWith({ slo_id: 'slo-1234' });
  });

  it('reports slo_cloned when the clone action is clicked', () => {
    const { getByTestId } = openActionsMenu();

    fireEvent.click(getByTestId('sloActionsClone'));

    expect(telemetryMock.reportSloCloned).toHaveBeenCalledWith({ slo_id: 'slo-1234' });
    expect(mockTriggerAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'clone', item: slo })
    );
  });

  it('reports slo_deleted when the delete action is clicked', () => {
    const { getByTestId } = openActionsMenu();

    fireEvent.click(getByTestId('sloActionsDelete'));

    expect(telemetryMock.reportSloDeleted).toHaveBeenCalledWith({ slo_id: 'slo-1234' });
    expect(mockTriggerAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'delete', item: slo })
    );
  });

  it('reports slo_reset when the reset action is clicked', () => {
    const { getByTestId } = openActionsMenu();

    fireEvent.click(getByTestId('sloActionsReset'));

    expect(telemetryMock.reportSloReset).toHaveBeenCalledWith({ slo_id: 'slo-1234' });
    expect(mockTriggerAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reset', item: slo })
    );
  });

  it('does not throw when telemetry client is unavailable', () => {
    usePluginContextMock.mockReturnValue({ telemetry: undefined });
    const { getByTestId } = openActionsMenu();

    expect(() => fireEvent.click(getByTestId('sloActionsEdit'))).not.toThrow();
  });
});
