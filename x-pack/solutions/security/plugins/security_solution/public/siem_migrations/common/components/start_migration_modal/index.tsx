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
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import type { ReactNode } from 'react-markdown';
import { useAIConnectors } from '../../../../common/hooks/use_ai_connectors';
import { useKibana } from '../../../../common/lib/kibana';
import { OnboardingCardId, OnboardingTopicId } from '../../../../onboarding/constants';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import type { MigrationSettingsBase } from '../../types';
import * as i18n from './translations';

export interface StartMigrationModalProps {
  /** Modals title */
  title: string;
  /** Modals description message */
  description: string;
  /** default settings that needs to be selected in the modal */
  defaultSettings?: Partial<MigrationSettingsBase>;
  onStartMigrationWithSettings: (settings: MigrationSettingsBase) => void;
  /** Callback called when closing the modal */
  onClose: () => void;
  /** Additional settings component to allow modal customization */
  additionalSettings?: React.ReactElement;
}

export const DATA_TEST_SUBJ_PREFIX = 'startMigrationModal';

export const StartMigrationModal: FC<StartMigrationModalProps> = React.memo(
  ({
    title,
    description,
    defaultSettings = {},
    onClose: closeModal,
    onStartMigrationWithSettings: startMigrationWithSettings,
    additionalSettings,
  }) => {
    const { connectorId } = defaultSettings;

    const { siemMigrations, settings } = useKibana().services;

    const { aiConnectors, isLoading } = useAIConnectors();

    const [selectedConnectorId, setSelectedConnectorId] = useState<string | undefined>(
      // Both `siemMigrations.rules` and `siemMigrations.dashboards` store connector using the same key,
      // that is why it is does not matter which one we use here to get access to it.
      connectorId || siemMigrations.rules.connectorIdStorage.get() || aiConnectors[0]?.id
    );

    const startMigrationModalTitleId = useGeneratedHtmlId();

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
        });
        closeModal();
      },
      [startMigrationWithSettings, selectedConnectorId, closeModal]
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
        <EuiModal
          aria-labelledby={startMigrationModalTitleId}
          onClose={closeModal}
          data-test-subj={DATA_TEST_SUBJ_PREFIX}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle
              data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Title`}
              id={startMigrationModalTitleId}
            >
              {title}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Description`}>
              <p>{description}</p>
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
                label={i18n.START_MIGRATION_MODAL_AI_CONNECTOR_LABEL}
                helpText={
                  <FormattedMessage
                    id="xpack.securitySolution.siemMigrations.reprocessFailedDialog.connectorHelpText"
                    defaultMessage={'To set up other LLM connectors, visit {link}.'}
                    values={{
                      link: (
                        /* eslint-disable-next-line @elastic/eui/href-or-on-click */
                        <EuiLink href={setupAIConnectorLink} onClick={onClickSetupAIConnector}>
                          {i18n.START_MIGRATION_MODAL_SETUP_NEW_AI_CONNECTOR_HELP_TEXT}
                        </EuiLink>
                      ),
                    }}
                  />
                }
                isInvalid={!selectedConnectorId}
                aria-required={true}
              >
                <ConnectorSelector
                  connectors={aiConnectors}
                  selectedId={selectedConnectorId}
                  onChange={setSelectedConnectorId}
                  isInvalid={!selectedConnectorId}
                  isLoading={isLoading}
                  mode={'combobox'}
                  settings={settings}
                />
              </EuiFormRow>
              {additionalSettings && <EuiFormRow>{additionalSettings}</EuiFormRow>}
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    aria-label={i18n.START_MIGRATION_MODAL_CANCEL}
                    onClick={closeModal}
                    data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Cancel`}
                  >
                    {i18n.START_MIGRATION_MODAL_CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    type="submit"
                    data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-Translate`}
                    color="primary"
                    fill
                  >
                    {i18n.START_MIGRATION_MODAL_TRANSLATE}
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
StartMigrationModal.displayName = 'StartMigrationModal';
