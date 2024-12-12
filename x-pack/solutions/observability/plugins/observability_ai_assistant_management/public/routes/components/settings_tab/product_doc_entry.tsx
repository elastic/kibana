/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../hooks/use_kibana';
import { useGetProductDocStatus } from '../../../hooks/use_get_product_doc_status';
import { useInstallProductDoc } from '../../../hooks/use_install_product_doc';
import { useUninstallProductDoc } from '../../../hooks/use_uninstall_product_doc';

export function ProductDocEntry() {
  const { overlays } = useKibana().services;

  const [isInstalled, setInstalled] = useState<boolean>(true);
  const [isInstalling, setInstalling] = useState<boolean>(false);

  const { mutateAsync: installProductDoc } = useInstallProductDoc();
  const { mutateAsync: uninstallProductDoc } = useUninstallProductDoc();
  const { status, isLoading: isStatusLoading } = useGetProductDocStatus();

  useEffect(() => {
    if (status) {
      setInstalled(status.overall === 'installed');
    }
  }, [status]);

  const onClickInstall = useCallback(() => {
    setInstalling(true);
    installProductDoc().then(
      () => {
        setInstalling(false);
        setInstalled(true);
      },
      () => {
        setInstalling(false);
        setInstalled(false);
      }
    );
  }, [installProductDoc]);

  const onClickUninstall = useCallback(() => {
    overlays
      .openConfirm(
        i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.productDocUninstallConfirmText',
          {
            defaultMessage: `Are you sure you want to uninstall the Elastic documentation?`,
          }
        ),
        {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.productDocUninstallConfirmTitle',
            {
              defaultMessage: `Uninstalling Elastic documentation`,
            }
          ),
        }
      )
      .then((confirmed) => {
        if (confirmed) {
          uninstallProductDoc().then(() => {
            setInstalling(false);
            setInstalled(false);
          });
        }
      });
  }, [overlays, uninstallProductDoc]);

  const content = useMemo(() => {
    if (isStatusLoading) {
      return <></>;
    }
    if (isInstalling) {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiLoadingSpinner size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.observabilityAiAssistantManagement.settingsPage.installingText"
              defaultMessage="Installing..."
            />
          </EuiText>
        </EuiFlexGroup>
      );
    }
    if (isInstalled) {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiHealth textSize="s" color="success">
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocInstalledLabel',
                { defaultMessage: 'Installed' }
              )}
            </EuiHealth>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="settingsTabUninstallProductDocButton"
              onClick={onClickUninstall}
              color="warning"
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.uninstallProductDocButtonLabel',
                { defaultMessage: 'Uninstall' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    return (
      <EuiFlexGroup justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="settingsTabInstallProductDocButton" onClick={onClickInstall}>
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocButtonLabel',
              { defaultMessage: 'Install' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [isInstalled, isInstalling, isStatusLoading, onClickInstall, onClickUninstall]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          {i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.productDocLabel', {
            defaultMessage: 'Elastic documentation',
          })}
        </h3>
      }
      description={
        <p>
          <em>
            {i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.techPreview', {
              defaultMessage: '[technical preview] ',
            })}
          </em>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.productDocDescription',
            {
              defaultMessage:
                "Install Elastic documentation to improve the assistant's efficiency.",
            }
          )}
        </p>
      }
    >
      <EuiFormRow fullWidth>{content}</EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
