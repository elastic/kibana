/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ActionType } from '@kbn/actions-types';
import { useKibana } from '../hooks/use_kibana';
import { ConnectorTypePickerFlyout } from './connector_type_picker_flyout';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const type = (id: string, overrides: Partial<ActionType> = {}): ActionType => ({
  id,
  name: `Type ${id}`,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: [],
  isSystemActionType: false,
  isDeprecated: false,
  ...overrides,
});

const setup = (types: ActionType[]) => {
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  mockUseKibana.mockReturnValue({
    services: {
      nightshiftInvestigations: {
        investigationsClient: {
          fetch: jest.fn(async () => ({ connector_types: types })),
        },
      },
      triggersActionsUi: {
        getAddConnectorFlyout,
        actionTypeRegistry: { has: () => false, get: jest.fn() },
      },
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ConnectorTypePickerFlyout onClose={jest.fn()} onConnectorCreated={jest.fn()} />
      </QueryClientProvider>
    </I18nProvider>
  );
  return { getAddConnectorFlyout };
};

const initialConnectorOf = (getAddConnectorFlyout: jest.Mock): unknown =>
  (getAddConnectorFlyout.mock.calls as unknown as Array<[{ initialConnector: unknown }]>)[0][0]
    .initialConnector;

describe('ConnectorTypePickerFlyout', () => {
  it('limits a spec connector to its test sub-action', async () => {
    const { getAddConnectorFlyout } = setup([type('.github', { source: 'spec' })]);

    fireEvent.click(await screen.findByRole('button', { name: /Type \.github/ }));

    expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
    expect(initialConnectorOf(getAddConnectorFlyout)).toEqual({
      actionTypeId: '.github',
      config: { selectedActions: ['_test'] },
    });
  });

  it('leaves the config unset for a stack connector', async () => {
    const { getAddConnectorFlyout } = setup([type('.http', { source: 'stack' })]);

    fireEvent.click(await screen.findByRole('button', { name: /Type \.http/ }));

    expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
    expect(initialConnectorOf(getAddConnectorFlyout)).toEqual({ actionTypeId: '.http' });
  });
});
