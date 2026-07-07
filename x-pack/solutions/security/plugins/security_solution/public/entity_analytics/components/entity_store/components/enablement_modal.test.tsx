/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { RiskEngineMissingPrivilegesResponse } from '../../../hooks/use_missing_risk_engine_privileges';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import { EnablementConfirmationModal } from './enablement_modal';

const mockOnClose = jest.fn();
const mockOnConfirm = jest.fn();

const mockUseMissingRiskEnginePrivileges = jest.fn();
jest.mock('../../../hooks/use_missing_risk_engine_privileges', () => ({
  useMissingRiskEnginePrivileges: () => mockUseMissingRiskEnginePrivileges(),
}));

const mockUseEntityEnginePrivileges = jest.fn();
jest.mock('../hooks/use_entity_engine_privileges', () => ({
  useEntityEnginePrivileges: () => mockUseEntityEnginePrivileges(),
}));

const mockUseContractComponents = jest.fn(() => ({}));
jest.mock('../../../../common/hooks/use_contract_component', () => ({
  useContractComponents: () => mockUseContractComponents(),
}));

jest.mock('../../risk_engine_privileges_callout', () => ({
  RiskEnginePrivilegesCallOut: () => (
    <div data-test-subj="callout-missing-risk-engine-privileges" />
  ),
}));

jest.mock('./entity_store_missing_privileges_callout', () => ({
  EntityStoreMissingPrivilegesCallout: () => (
    <div data-test-subj="callout-missing-privileges-callout" />
  ),
}));

const defaultProps = {
  visible: true,
  onClose: mockOnClose,
  onConfirm: mockOnConfirm,
};

const allEntityEnginePrivileges: EntityAnalyticsPrivileges = {
  has_all_required: true,
  privileges: {
    elasticsearch: {
      cluster: { manage_enrich: true },
      index: { 'logs-*': { read: false, view_index_metadata: true } },
    },
    kibana: { 'saved_object:entity-engine-status/all': true },
  },
};

const missingEntityEnginePrivileges: EntityAnalyticsPrivileges = {
  has_all_required: false,
  privileges: {
    elasticsearch: {
      cluster: { manage_enrich: false },
      index: { 'logs-*': { read: false, view_index_metadata: false } },
    },
    kibana: { 'saved_object:entity-engine-status/all': false },
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

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('EnablementConfirmationModal', () => {
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

    it('renders the modal when visible is true', () => {
      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId('entityAnalyticsEnablementModal')).toBeInTheDocument();
    });

    it('does not render the modal when visible is false', () => {
      render(<EnablementConfirmationModal {...defaultProps} visible={false} />, {
        wrapper: Wrapper,
      });
      expect(screen.queryByTestId('entityAnalyticsEnablementModal')).not.toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when enable button is clicked', () => {
      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      fireEvent.click(screen.getByTestId('entityAnalyticsEnablementConfirmButton'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not show privilege callouts when privileges are present', () => {
      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.queryByTestId('callout-missing-privileges-callout')).not.toBeInTheDocument();
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

    it('shows entity engine missing privileges callout', () => {
      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId('callout-missing-privileges-callout')).toBeInTheDocument();
    });

    it('shows risk engine missing privileges callout', () => {
      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.getByTestId('callout-missing-risk-engine-privileges')).toBeInTheDocument();
    });

    it('disables the enable button when all privileges are missing', () => {
      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      const enableButton = screen.getByTestId('entityAnalyticsEnablementConfirmButton');
      expect(enableButton).toBeDisabled();
    });

    it('renders additional charges message when available', () => {
      const AdditionalChargesMessageMock = () => <span data-test-subj="enablement-modal-test" />;
      mockUseContractComponents.mockReturnValue({
        AdditionalChargesMessage: AdditionalChargesMessageMock,
      });

      render(<EnablementConfirmationModal {...defaultProps} />, { wrapper: Wrapper });
      expect(screen.queryByTestId('enablement-modal-test')).toBeInTheDocument();
    });
  });
});
