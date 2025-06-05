/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiSpacer,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiSuperSelect,
  EuiFormRow,
  EuiSwitch,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';

import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { getConnectorDescription } from '../../../../common/utils/get_connector_description';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import * as i18n from './translations';
import type { RuleMigrationSettings } from '../../types';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';
import { OnboardingCardId, OnboardingTopicId } from '../../../../onboarding/constants';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';

interface StartMigrationModalProps {
  lastConnectorId?: RuleMigrationSettings['connectorId'];
  skipPrebuiltRulesMatching?: RuleMigrationSettings['skipPrebuiltRulesMatching'];
  startMigrationWithSettings: (settings: RuleMigrationSettings) => void;
  onClose: () => void;
  availableConnectors: ActionConnector[];
  numberOfRules: number;
}

export const DATA_TEST_SUBJ_PREFIX = 'startMigrationModal';

export const StartMigrationModal: FC<StartMigrationModalProps> = React.memo(
  function StartMigrationModal({
    lastConnectorId,
    skipPrebuiltRulesMatching = false,
    onClose: closeModal,
    startMigrationWithSettings,
    numberOfRules = 0,
    availableConnectors = [],
  }) {
    const spaceId = useSpaceId() ?? 'default';
    const { actionTypeRegistry } = useKibana().services.triggersActionsUi;
    const [siemMigrationsDefaultConnectorId] = useStoredAssistantConnectorId(spaceId);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>(
      lastConnectorId || siemMigrationsDefaultConnectorId || ''
    );
    const [enablePrebuiltRulesMatching, setEnablePrebuiltRuleMatching] = useState<boolean>(
      !skipPrebuiltRulesMatching
    );

    const modalTitleId = useGeneratedHtmlId();

    const selectOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
      return availableConnectors.map((connector) => {
        const connectorDescription = getConnectorDescription({
          connector,
          actionTypeRegistry,
        });
        return {
          value: connector.id,
          inputDisplay: connector.name,
          dropdownDisplay: (
            <>
              <strong>{connector.name}</strong>
              <EuiText size="s" color="subdued">
                <p>{connectorDescription}</p>
              </EuiText>
            </>
          ),
          'data-test-subj': `${DATA_TEST_SUBJ_PREFIX}-ConnectorOption`,
        };
      });
    }, [actionTypeRegistry, availableConnectors]);

    const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
    const { onClick: onClickSetupAIConnector, href: setupAIConnectorLink } =
      getSecuritySolutionLinkProps({
        deepLinkId: SecurityPageName.landing,
        path: `${OnboardingTopicId.siemMigrations}#${OnboardingCardId.siemMigrationsAiConnectors}`,
      });

    const onStartMigrationWithSettings = useCallback(() => {
      startMigrationWithSettings({
        connectorId: selectedConnectorId,
        skipPrebuiltRulesMatching: !enablePrebuiltRulesMatching,
      });
      closeModal();
    }, [startMigrationWithSettings, selectedConnectorId, enablePrebuiltRulesMatching, closeModal]);

    return (
      <EuiModal onClose={closeModal} data-test-subj={DATA_TEST_SUBJ_PREFIX}>
        <EuiModalHeader>
          <EuiModalHeaderTitle data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Title`} id={modalTitleId}>
            {i18n.REPROCESS_RULES_DIALOG_TITLE(numberOfRules)}
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText>
            <p>{i18n.REPROCESS_RULES_DIALOG_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.REPROCESS_RULES_DIALOG_AI_CONNECTOR_LABEL}
            helpText={
              <FormattedMessage
                id="xpack.securitySolution.siemMigrations.reprocessFailedRulesDialog.connectorHelpText"
                defaultMessage={'To setup other LLM connectors, visit {link}.'}
                values={{
                  link: (
                    /* eslint-disable-next-line @elastic/eui/href-or-on-click */
                    <EuiLink href={setupAIConnectorLink} onClick={onClickSetupAIConnector}>
                      {i18n.REPROCESS_RULES_DIALOG_SETUP_NEW_AI_CONNECTOR_HELP_TEXT}
                    </EuiLink>
                  ),
                }}
              />
            }
          >
            <EuiSuperSelect
              options={selectOptions}
              valueOfSelected={selectedConnectorId}
              onChange={setSelectedConnectorId}
              data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-ConnectorSelector`}
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiSwitch
              data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-PrebuiltRulesMatchingSwitch`}
              label={i18n.REPROCESS_RULES_DIALOG_PREBUILT_RULES_LABEL}
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
                {i18n.REPROCESS_RULES_DIALOG_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Translate`}
                color="primary"
                fill
                onClick={onStartMigrationWithSettings}
              >
                {i18n.REPROCESS_RULES_DIALOG_TRANSLATE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
      </EuiModal>
    );
  }
);
