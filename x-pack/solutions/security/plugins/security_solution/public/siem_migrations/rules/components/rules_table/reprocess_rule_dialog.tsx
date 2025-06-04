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
import {
  getActionTypeTitle,
  getGenAiConfig,
} from '@kbn/elastic-assistant/impl/connectorland/helpers';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import * as i18n from './translations';
import type { RuleMigrationSettings } from '../../types';
import { useStoredAssistantConnectorId } from '../../../../onboarding/components/hooks/use_stored_state';
import { OnboardingCardId, OnboardingTopicId } from '../../../../onboarding/constants';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';

interface ReprocessFailedRulesDialogProps {
  isModalVisible: boolean;
  closeModal: () => void;
  lastExecution?: Partial<RuleMigrationSettings>;
  startMigration: (settings: RuleMigrationSettings) => void;
  connectors: ActionConnector[];
  numberOfFailedRules?: number;
}

export const ReprocessFailedRulesDialog: FC<ReprocessFailedRulesDialogProps> = React.memo(
  function ReprocessFailedRulesDialog({
    isModalVisible,
    closeModal,
    lastExecution,
    startMigration,
    numberOfFailedRules = 0,
    connectors = [],
  }) {
    const spaceId = useSpaceId() ?? 'default';
    const { actionTypeRegistry } = useKibana().services.triggersActionsUi;
    const [siemMigrationsDefaultConnectorId] = useStoredAssistantConnectorId(spaceId);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>(
      lastExecution?.connectorId || siemMigrationsDefaultConnectorId || ''
    );
    const [enablePrebuiltRulesMatching, setEnablePrebuiltRuleMatching] = useState<boolean>(
      lastExecution?.shouldMatchPrebuiltRules ?? true
    );
    const modalTitleId = useGeneratedHtmlId();

    const selectOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
      return connectors.map((connector) => {
        // TODO : dedup from x-pack/solutions/security/plugins/security_solution/public/onboarding/components/onboarding_body/cards/common/connectors/connector_selector_panel.tsx
        let description: string;
        if (connector.isPreconfigured) {
          description = 'Pre-configured Connector';
        } else {
          description =
            getGenAiConfig(connector)?.apiProvider ??
            getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));
        }

        return {
          value: connector.id,
          inputDisplay: connector.name,
          dropdownDisplay: (
            <>
              <strong>{connector.name}</strong>
              <EuiText size="s" color="subdued">
                <p>{description}</p>
              </EuiText>
            </>
          ),
          'data-test-subj': `reprocessFailedRulesConnectorSelector-${connector.id}`,
        };
      });
    }, [actionTypeRegistry, connectors]);

    const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
    const { onClick: onClickSetupAIConnector, href: setupAIConnectorLink } =
      getSecuritySolutionLinkProps({
        deepLinkId: SecurityPageName.landing,
        path: `${OnboardingTopicId.siemMigrations}#${OnboardingCardId.siemMigrationsAiConnectors}`,
      });

    const startMigrationWithSettings = useCallback(() => {
      startMigration({
        connectorId: selectedConnectorId,
        shouldMatchPrebuiltRules: enablePrebuiltRulesMatching,
      });
      closeModal();
    }, [startMigration, selectedConnectorId, enablePrebuiltRulesMatching, closeModal]);

    if (isModalVisible) {
      return (
        <EuiModal onClose={closeModal} data-test-subj="reprocessFailedRulesDialog">
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {i18n.REPROCESS_RULES_DIALOG_TITLE(numberOfFailedRules)}
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
                data-test-subj="reprocessFailedRulesConnectorSelector"
              />
            </EuiFormRow>
            <EuiFormRow>
              <EuiSwitch
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
                  data-test-subj="reprocessFailedRulesDialogCancel"
                >
                  {i18n.REPROCESS_RULES_DIALOG_CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton color="primary" fill onClick={startMigrationWithSettings}>
                  {i18n.REPROCESS_RULES_DIALOG_TRANSLATE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
        </EuiModal>
      );
    }
  }
);
