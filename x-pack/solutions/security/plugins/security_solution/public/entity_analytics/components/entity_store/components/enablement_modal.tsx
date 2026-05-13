/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useContractComponents } from '../../../../common/hooks/use_contract_component';
import { RiskEnginePrivilegesCallOut } from '../../risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../../../hooks/use_missing_risk_engine_privileges';
import { useEntityEnginePrivileges } from '../hooks/use_entity_engine_privileges';
import { EntityStoreMissingPrivilegesCallout } from './entity_store_missing_privileges_callout';

interface EnablementConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const EnablementConfirmationModal: React.FC<EnablementConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const riskEnginePrivileges = useMissingRiskEnginePrivileges();
  const { data: entityEnginePrivileges, isLoading: isLoadingEntityEnginePrivileges } =
    useEntityEnginePrivileges();

  const { AdditionalChargesMessage } = useContractComponents();

  const hasRiskScorePrivileges =
    !riskEnginePrivileges.isLoading && riskEnginePrivileges.hasAllRequiredPrivileges;
  const hasEntityStorePrivileges =
    !isLoadingEntityEnginePrivileges && entityEnginePrivileges?.has_all_required;

  const isConfirmDisabled = !hasRiskScorePrivileges && !hasEntityStorePrivileges;

  if (!visible) {
    return null;
  }

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      data-test-subj="entityAnalyticsEnablementModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.enablement.modal.title"
            defaultMessage="Enable Entity Analytics"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column">
          {AdditionalChargesMessage && (
            <EuiFlexItem>
              <AdditionalChargesMessage />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiText>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.enablement.modal.description"
                defaultMessage="Enabling Entity Analytics will start the risk score maintainer and Entity Store. This provides real-time visibility into entity activity and stores data for entities observed in events."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiHorizontalRule margin="none" />
          {!riskEnginePrivileges.isLoading && !riskEnginePrivileges.hasAllRequiredPrivileges && (
            <EuiFlexItem>
              <RiskEnginePrivilegesCallOut privileges={riskEnginePrivileges} />
            </EuiFlexItem>
          )}
          {entityEnginePrivileges && !entityEnginePrivileges.has_all_required && (
            <EuiFlexItem>
              <EntityStoreMissingPrivilegesCallout privileges={entityEnginePrivileges} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" justifyContent="flexEnd">
              <EuiButtonEmpty onClick={onClose}>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.enablement.modal.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
              <EuiButton
                onClick={onConfirm}
                fill
                isDisabled={isConfirmDisabled}
                data-test-subj="entityAnalyticsEnablementConfirmButton"
              >
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.enablement.modal.enable"
                  defaultMessage="Enable"
                />
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
