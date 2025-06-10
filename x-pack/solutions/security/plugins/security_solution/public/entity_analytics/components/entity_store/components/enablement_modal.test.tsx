/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EntityStoreEnablementModalProps } from './enablement_modal';
import { EntityStoreEnablementModal } from './enablement_modal';
import { TestProviders } from '../../../../common/mock';
import {
  type EntityAnalyticsPrivileges,
  RiskEngineStatusEnum,
  StoreStatusEnum,
} from '../../../../../common/api/entity_analytics';
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
  riskEngineStatus: RiskEngineStatusEnum.NOT_INSTALLED,
  entityStoreStatus: StoreStatusEnum.not_installed,
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
    clusterPrivileges: { enable: [], run: [] },
    indexPrivileges: [],
  },
};

const renderComponent = (props: EntityStoreEnablementModalProps = defaultProps) => {
  return render(<EntityStoreEnablementModal {...props} />, {
    wrapper: TestProviders,
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
      renderComponent(defaultProps);
      fireEvent.click(screen.getByText('Enable'));
      expect(mockEnableStore).toHaveBeenCalledWith({ riskScore: true, entityStore: true });
    });

    it('should display proceed warning when no enablement options are selected', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('enablementEntityStoreSwitch')); // unselect entity store
      fireEvent.click(screen.getByTestId('enablementRiskScoreSwitch')); // unselect risk engine
      expect(screen.getByText('Please enable at least one option to proceed.')).toBeInTheDocument();
    });

    it('should disable the enable button when enablementOptions are false', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('enablementEntityStoreSwitch')); // unselect entity store
      fireEvent.click(screen.getByTestId('enablementRiskScoreSwitch')); // unselect risk engine

      const enableButton = screen.getByRole('button', { name: /Enable/i });
      expect(enableButton).toBeDisabled();
    });

    it('should show proceed warning when riskScore is not installed and unchecked but entityStore is already running', () => {
      renderComponent({
        ...defaultProps,
        riskEngineStatus: RiskEngineStatusEnum.NOT_INSTALLED,
        entityStoreStatus: StoreStatusEnum.running,
      });
      fireEvent.click(screen.getByTestId('enablementRiskScoreSwitch')); // unselect risk engine
      expect(screen.getByText('Please enable at least one option to proceed.')).toBeInTheDocument();
    });

    it('should show proceed warning when entityStore is not installed and unchecked but riskScore is already installed', () => {
      renderComponent({
        ...defaultProps,
        riskEngineStatus: RiskEngineStatusEnum.ENABLED,
        entityStoreStatus: StoreStatusEnum.not_installed,
      });
      fireEvent.click(screen.getByTestId('enablementEntityStoreSwitch')); // unselect risk engine

      expect(screen.getByText('Please enable at least one option to proceed.')).toBeInTheDocument();
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

    it('should disabled the "enable" button', async () => {
      renderComponent();
      expect(screen.getByTestId('callout-missing-entity-store-privileges')).toBeInTheDocument();

      const enableButton = screen.getByRole('button', { name: /Enable/i });
      expect(enableButton).toBeDisabled();
    });
  });
});
