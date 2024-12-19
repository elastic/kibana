/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { fireEvent, render, screen } from '@testing-library/react';
import { EntityStoreEnablementModal } from './enablement_modal';
import { TestProviders } from '../../../../common/mock';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import type { RiskEngineMissingPrivilegesResponse } from '../../../hooks/use_missing_risk_engine_privileges';

const mockToggle = jest.fn();
const mockEnableStore = jest.fn(() => jest.fn());

const mockUseEntityEnginePrivileges = jest.fn();
jest.mock('../hooks/use_entity_engine_privileges', () => ({
  useEntityEnginePrivileges: () => mockUseEntityEnginePrivileges(),
}));

const mockUseMissingRiskEnginePrivileges = jest.fn();
jest.mock('../../../hooks/use_missing_risk_engine_privileges', () => ({
  useMissingRiskEnginePrivileges: () => mockUseMissingRiskEnginePrivileges(),
}));

const mockUseContractComponents = jest.fn(() => ({}));
jest.mock('../../../../common/hooks/use_contract_component', () => ({
  useContractComponents: () => mockUseContractComponents(),
}));

const defaultProps = {
  visible: true,
  toggle: mockToggle,
  enableStore: mockEnableStore,
  riskScore: { disabled: false, checked: false },
  entityStore: { disabled: false, checked: false },
};

const allEntityEnginePrivileges: EntityAnalyticsPrivileges = {
  has_all_required: true,
  privileges: {
    elasticsearch: {
      cluster: {
        manage_enrich: true,
      },
      index: { 'logs-*': { read: false, view_index_metadata: true } },
    },
    kibana: {
      'saved_object:entity-engine-status/all': true,
    },
  },
};

const missingEntityEnginePrivileges: EntityAnalyticsPrivileges = {
  has_all_required: false,
  privileges: {
    elasticsearch: {
      cluster: {
        manage_enrich: false,
      },
      index: { 'logs-*': { read: false, view_index_metadata: false } },
    },
    kibana: {
      'saved_object:entity-engine-status/all': false,
    },
  },
};

const allRiskEnginePrivileges: RiskEngineMissingPrivilegesResponse = {
  hasAllRequiredPrivileges: true,
  isLoading: false,
};

const missingRiskEnginePrivileges: RiskEngineMissingPrivilegesResponse = {
  isLoading: false,
  hasAllRequiredPrivileges: false,
  missingPrivileges: {
    clusterPrivileges: [],
    indexPrivileges: [],
  },
};

const renderComponent = async (props = defaultProps) => {
  await act(async () => {
    return render(<EntityStoreEnablementModal {...props} />, { wrapper: TestProviders });
  });
};

describe('EntityStoreEnablementModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with all privileges', () => {
    beforeEach(() => {
      mockUseEntityEnginePrivileges.mockReturnValue({
        data: allEntityEnginePrivileges,
        isLoading: false,
      });

      mockUseMissingRiskEnginePrivileges.mockReturnValue(allRiskEnginePrivileges);
    });

    it('should render the modal when visible is true', () => {
      renderComponent();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render the modal when visible is false', () => {
      renderComponent({ ...defaultProps, visible: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call toggle function when cancel button is clicked', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockToggle).toHaveBeenCalledWith(false);
    });

    it('should call enableStore function when enable button is clicked', () => {
      renderComponent({
        ...defaultProps,
        riskScore: { ...defaultProps.riskScore, checked: true },
        entityStore: { ...defaultProps.entityStore, checked: true },
      });
      fireEvent.click(screen.getByText('Enable'));
      expect(mockEnableStore).toHaveBeenCalledWith({ riskScore: true, entityStore: true });
    });

    it('should display proceed warning when no enablement options are selected', () => {
      renderComponent();
      expect(screen.getByText('Please enable at least one option to proceed.')).toBeInTheDocument();
    });

    it('should disable the enable button when enablementOptions are false', () => {
      renderComponent({
        ...defaultProps,
        riskScore: { ...defaultProps.riskScore, checked: false },
        entityStore: { ...defaultProps.entityStore, checked: false },
      });

      const enableButton = screen.getByRole('button', { name: /Enable/i });
      expect(enableButton).toBeDisabled();
    });

    it('should not show entity engine missing privileges warning when no missing privileges', () => {
      renderComponent();
      expect(
        screen.queryByTestId('callout-missing-entity-store-privileges')
      ).not.toBeInTheDocument();
    });

    it('should not show risk engine missing privileges warning when no missing privileges', () => {
      renderComponent();
      expect(
        screen.queryByTestId('callout-missing-risk-engine-privileges')
      ).not.toBeInTheDocument();
    });
  });

  describe('with no privileges', () => {
    beforeEach(() => {
      mockUseEntityEnginePrivileges.mockReturnValue({
        data: missingEntityEnginePrivileges,
        isLoading: false,
      });

      mockUseMissingRiskEnginePrivileges.mockReturnValue(missingRiskEnginePrivileges);
    });

    it('should show entity engine missing privileges warning when missing privileges', () => {
      renderComponent();
      expect(screen.getByTestId('callout-missing-entity-store-privileges')).toBeInTheDocument();
    });

    it('should show risk engine missing privileges warning when missing privileges', () => {
      renderComponent();
      expect(screen.getByTestId('callout-missing-risk-engine-privileges')).toBeInTheDocument();
    });

    it('should render additional charges message when available', async () => {
      const AdditionalChargesMessageMock = () => <span data-test-subj="enablement-modal-test" />;
      mockUseContractComponents.mockReturnValue({
        AdditionalChargesMessage: AdditionalChargesMessageMock,
      });

      await renderComponent();

      expect(screen.queryByTestId('enablement-modal-test')).toBeInTheDocument();
    });
  });
});
