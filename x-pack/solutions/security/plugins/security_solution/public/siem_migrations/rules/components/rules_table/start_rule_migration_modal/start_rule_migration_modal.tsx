/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiSpacer,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiFormRow,
  EuiSwitch,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
  EuiOutsideClickDetector,
  EuiForm,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import type { ConnectorSelectorProps } from '@kbn/security-solution-connectors';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import type { ReactNode } from 'react-markdown';
import { useAIConnectors } from '../../../../../common/hooks/use_ai_connectors';
import { getConnectorDescription } from '../../../../../common/utils/connectors/get_connector_description';
import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from '../translations';
import type { RuleMigrationSettings } from '../../../types';
import { OnboardingCardId, OnboardingTopicId } from '../../../../../onboarding/constants';
import { useGetSecuritySolutionLinkProps } from '../../../../../common/components/links';

interface StartRuleMigrationModalProps {
  /** default settings that needs to be selected in the modal */
  defaultSettings?: Partial<RuleMigrationSettings>;
  onStartMigrationWithSettings: (settings: RuleMigrationSettings) => void;
  /** Callback called when closing the modal */
  onClose: () => void;
  /** Number of rules that will be process in this migration */
  numberOfRules: number;
}

export const DATA_TEST_SUBJ_PREFIX = 'startMigrationModal';

export const StartRuleMigrationModal: FC<StartRuleMigrationModalProps> = React.memo(
  function StartRuleMigrationModal({
    defaultSettings = {},
    onClose: closeModal,
    onStartMigrationWithSettings: startMigrationWithSettings,
    numberOfRules = 0,
  }) {
    const { connectorId, skipPrebuiltRulesMatching } = defaultSettings;

    const {
      triggersActionsUi: { actionTypeRegistry },
      siemMigrations,
    } = useKibana().services;

    const { aiConnectors, isLoading } = useAIConnectors();

    const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>(
      connectorId || siemMigrations.rules.connectorIdStorage.get() || aiConnectors[0]?.id
    );

    const [enablePrebuiltRulesMatching, setEnablePrebuiltRuleMatching] = useState<boolean>(
      !skipPrebuiltRulesMatching
    );

    const startRuleMigrationModalTitleId = useGeneratedHtmlId();

    const connectorOptions: ConnectorSelectorProps['connectors'] = useMemo(() => {
      return aiConnectors.map((connector) => {
        const connectorDescription = getConnectorDescription({
          connector,
          actionTypeRegistry,
        });
        return {
          id: connector.id,
          name: connector.name,
          description: connectorDescription,
        };
      });
    }, [actionTypeRegistry, aiConnectors]);

    const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();

    const { onClick: onClickSetupAIConnector, href: setupAIConnectorLink } =
      getSecuritySolutionLinkProps({
        deepLinkId: SecurityPageName.landing,
        path: `${OnboardingTopicId.siemMigrations}#${OnboardingCardId.siemMigrationsAiConnectors}`,
      });

    const onStartMigrationWithSettings: React.FormEventHandler = useCallback(
      (e) => {
        e.preventDefault();
        if (!selectedConnectorId) {
          return;
        }
        startMigrationWithSettings({
          connectorId: selectedConnectorId,
          skipPrebuiltRulesMatching: !enablePrebuiltRulesMatching,
        });
        closeModal();
      },
      [startMigrationWithSettings, selectedConnectorId, enablePrebuiltRulesMatching, closeModal]
    );

    const errors = useMemo(() => {
      const allErrors: ReactNode[] = [];
      if (!selectedConnectorId) {
        allErrors.push(
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.startMigrationModal.connectorRequiredError"
            defaultMessage="An AI connector is required to start the translation."
          />
        );
      }
      return allErrors;
    }, [selectedConnectorId]);

    return (
      <EuiOutsideClickDetector onOutsideClick={closeModal}>
        <EuiModal aria-labelledby={startRuleMigrationModalTitleId} onClose={closeModal} data-test-subj={DATA_TEST_SUBJ_PREFIX}>
          <EuiModalHeader>
            <EuiModalHeaderTitle
              data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Title`}
              id={startRuleMigrationModalTitleId}
            >
              {i18n.REPROCESS_RULES_DIALOG_TITLE(numberOfRules)}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText>
              <p>{i18n.REPROCESS_RULES_DIALOG_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiForm
              component="form"
              onSubmit={onStartMigrationWithSettings}
              data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Form`}
              isInvalid={!selectedConnectorId}
              error={errors}
            >
              <EuiFormRow
                label={i18n.START_RULE_MIGRATION_MODAL_AI_CONNECTOR_LABEL}
                helpText={
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.reprocessFailedRulesDialog.connectorHelpText"
                    defaultMessage={'To setup other LLM connectors, visit {link}.'}
                    values={{
                      link: (
                        /* eslint-disable-next-line @elastic/eui/href-or-on-click */
                        <EuiLink href={setupAIConnectorLink} onClick={onClickSetupAIConnector}>
                          {i18n.START_RULE_MIGRATION_MODAL_SETUP_NEW_AI_CONNECTOR_HELP_TEXT}
                        </EuiLink>
                      ),
                    }}
                  />
                }
                isInvalid={!selectedConnectorId}
                aria-required={true}
              >
                <ConnectorSelector
                  connectors={connectorOptions}
                  selectedId={selectedConnectorId}
                  onChange={setSelectedConnectorId}
                  isInvalid={!selectedConnectorId}
                  isLoading={isLoading}
                  mode={'combobox'}
                />
              </EuiFormRow>
              <EuiFormRow>
                <EuiSwitch
                  data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-PrebuiltRulesMatchingSwitch`}
                  label={i18n.START_RULE_MIGRATION_MODAL_PREBUILT_RULES_LABEL}
                  checked={enablePrebuiltRulesMatching}
                  onChange={(e) => setEnablePrebuiltRuleMatching(e.target.checked)}
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={closeModal}
                    data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Cancel`}
                  >
                    {i18n.START_RULE_MIGRATION_MODAL_CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    type="submit"
                    data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Translate`}
                    color="primary"
                    fill
                  >
                    {i18n.START_RULE_MIGRATION_MODAL_TRANSLATE}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          </EuiModalBody>
        </EuiModal>
      </EuiOutsideClickDetector>
    );
  }
);