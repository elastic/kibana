/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityType } from '../../../../common/search_strategy';
import {
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { DocumentDetailsPreviewPanelKey } from '../../../flyout/document_details/shared/constants/panel_keys';
import { getRiskInputTab } from '.';
import type { RiskInputsTabProps } from './tabs/risk_inputs/risk_inputs_tab';

const mockOpenLeftPanel = jest.fn();
const mockOpenPreviewPanel = jest.fn();
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openLeftPanel: mockOpenLeftPanel,
    openPreviewPanel: mockOpenPreviewPanel,
  }),
}));

const mockUseStableExpandableFlyoutState = jest.fn();
jest.mock('../../../flyout/shared/hooks/use_stable_expandable_flyout_state', () => ({
  useStableExpandableFlyoutState: () => mockUseStableExpandableFlyoutState(),
}));

let capturedProps: RiskInputsTabProps<EntityType> | undefined;
jest.mock('./tabs/risk_inputs/risk_inputs_tab', () => ({
  RiskInputsTab: (props: RiskInputsTabProps<EntityType>) => {
    capturedProps = props;
    return <div data-test-subj="mockRiskInputsTab" />;
  },
}));

const leftPanel = {
  id: 'user-details-left',
  params: {
    entityId: 'user:elastic',
    path: {
      tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
      subTab: RiskScoreLeftPanelSubTab.RESOLUTION,
    },
  },
};

const renderRiskInputTab = () =>
  render(
    getRiskInputTab({
      entityType: EntityType.user,
      entityName: 'elastic',
      entityId: 'user:elastic',
      scopeId: 'scope-id',
    }).content
  );

describe('getRiskInputTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProps = undefined;
    mockUseStableExpandableFlyoutState.mockReturnValue({ left: leftPanel });
  });

  it('passes the sub-tab from the left panel URL state to RiskInputsTab', () => {
    renderRiskInputTab();

    expect(capturedProps?.subTab).toBe(RiskScoreLeftPanelSubTab.RESOLUTION);
  });

  it('passes no sub-tab when the left panel is not on the risk inputs tab', () => {
    mockUseStableExpandableFlyoutState.mockReturnValue({
      left: { ...leftPanel, params: { path: { tab: EntityDetailsLeftPanelTab.FIELDS_TABLE } } },
    });

    renderRiskInputTab();

    expect(capturedProps?.subTab).toBeUndefined();
  });

  it('writes the selected sub-tab back to the left panel URL state', () => {
    renderRiskInputTab();

    capturedProps?.onSubTabChange?.(RiskScoreLeftPanelSubTab.ENTITY);

    expect(mockOpenLeftPanel).toHaveBeenCalledWith({
      ...leftPanel,
      params: {
        ...leftPanel.params,
        path: {
          tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
          subTab: RiskScoreLeftPanelSubTab.ENTITY,
        },
      },
    });
  });

  it('does not open the left panel when there is no risk inputs left panel', () => {
    mockUseStableExpandableFlyoutState.mockReturnValue({});

    renderRiskInputTab();

    capturedProps?.onSubTabChange?.(RiskScoreLeftPanelSubTab.ENTITY);

    expect(mockOpenLeftPanel).not.toHaveBeenCalled();
  });

  it('opens the legacy alert preview panel when an alert is shown', () => {
    renderRiskInputTab();

    capturedProps?.onShowAlert('alert-id', 'alert-index');

    expect(mockOpenPreviewPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: DocumentDetailsPreviewPanelKey,
        params: expect.objectContaining({
          id: 'alert-id',
          indexName: 'alert-index',
          scopeId: 'scope-id',
          isPreviewMode: true,
        }),
      })
    );
  });
});
