/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { RiskInputsTab } from './risk_inputs_tab';
import { EntityType } from '../../../../common/search_strategy';

const mockOpenSystemFlyout = jest.fn();

jest.mock('../entity_details_flyout/tabs/risk_inputs/risk_inputs_tab', () => ({
  RiskInputsTab: jest.fn(() => <div data-test-subj="base-risk-inputs-tab" />),
}));

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { overlays: { openSystemFlyout: mockOpenSystemFlyout } } }),
}));

jest.mock('react-redux', () => ({ useStore: () => ({}) }));
jest.mock('react-router-dom', () => ({ useHistory: () => ({}) }));
jest.mock('../../../common/hooks/is_in_security_app', () => ({ useIsInSecurityApp: () => true }));
jest.mock('../../../flyout_v2/shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({}),
}));
jest.mock('../../../flyout_v2/shared/components/flyout_provider', () => ({
  flyoutProviders: jest.fn(() => null),
}));
jest.mock('../../../flyout_v2/document/main/document_flyout_wrapper', () => ({
  DocumentFlyoutWrapper: () => null,
}));
jest.mock('../../../flyout_v2/shared/components/cell_actions', () => ({
  cellActionRenderer: jest.fn(),
}));

import { RiskInputsTab as RiskInputsTabBase } from '../entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';

describe('RiskInputsTab (flyout v2 wrapper)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 RiskInputsTab, forwards props, and wires v2 alert preview navigation', () => {
    const { getByTestId } = render(
      <RiskInputsTab
        entityType={EntityType.host}
        entityName="host-1"
        scopeId="scope-id"
        entityId="entity-id"
      />
    );

    expect(getByTestId('base-risk-inputs-tab')).toBeInTheDocument();

    const props = (RiskInputsTabBase as unknown as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        entityType: EntityType.host,
        entityName: 'host-1',
        scopeId: 'scope-id',
        entityId: 'entity-id',
        openAlertPreview: expect.any(Function),
      })
    );

    // Invoking the injected callback opens the v2 system flyout (not the legacy panel).
    props.openAlertPreview('alert-1', 'index-1');
    expect(mockOpenSystemFlyout).toHaveBeenCalledTimes(1);
  });
});
