/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiCode,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Credential } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { toFeatureFlagsApiError, type FeatureFlagsApiError } from '../api_error';
import { useAppServices } from '../app_services';
import { ConfirmDeleteModal } from '../confirm_delete_modal';
import { cancelButtonLabel, closeButtonLabel, copyButtonLabel } from '../labels';
import { useAsyncData } from '../use_async_data';
import { useCatalog } from '../use_catalog';

interface CredentialRow {
  environment: string;
  name: string;
  credential?: Credential;
}

export const CredentialsPanel = ({ appKey, appName }: { appKey: string; appName: string }) => {
  const { api, notifications, canSave } = useAppServices();
  const catalog = useCatalog();
  const loadCredentials = useCallback(() => api.listCredentials(appKey), [api, appKey]);
  const credentials = useAsyncData(loadCredentials);
  const [rotateEnvironment, setRotateEnvironment] = useState<string>();
  const [rotateClientId, setRotateClientId] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<FeatureFlagsApiError>();
  const [revealedKey, setRevealedKey] = useState<string>();
  const [revokeEnvironment, setRevokeEnvironment] = useState<string>();
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<FeatureFlagsApiError>();

  const credentialByEnvironment = new Map(
    (credentials.data?.items ?? []).map((credential) => [credential.environment, credential])
  );
  const rows: CredentialRow[] = (catalog.data?.environments ?? []).map((environment) => ({
    environment: environment.key,
    name: environment.name,
    credential: credentialByEnvironment.get(environment.key),
  }));
  const knownEnvironments = new Set(rows.map((row) => row.environment));
  for (const credential of credentials.data?.items ?? []) {
    if (!knownEnvironments.has(credential.environment)) {
      rows.push({
        environment: credential.environment,
        name: credential.environment,
        credential,
      });
    }
  }

  const rotatingRow = rows.find((row) => row.environment === rotateEnvironment);
  const creating = rotatingRow ? !rotatingRow.credential : false;

  const rotate = async () => {
    if (!rotateEnvironment) {
      return;
    }
    setRotating(true);
    setRotateError(undefined);
    try {
      const response = await api.rotateCredential(appKey, rotateEnvironment, rotateClientId);
      setRevealedKey(response.sdk_key);
      setRotateEnvironment(undefined);
      setRotateClientId(false);
      credentials.reload();
    } catch (caught) {
      setRotateError(toFeatureFlagsApiError(caught));
    } finally {
      setRotating(false);
    }
  };

  const revoke = async () => {
    if (!revokeEnvironment) {
      return;
    }
    setRevoking(true);
    setRevokeError(undefined);
    try {
      await api.deleteCredential(appKey, revokeEnvironment);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.featureFlagsManagement.apps.credentials.revokeSuccessToast', {
          defaultMessage: 'Revoked the key for {environment}',
          values: { environment: revokeEnvironment },
        })
      );
      setRevokeEnvironment(undefined);
      credentials.reload();
    } catch (caught) {
      setRevokeError(toFeatureFlagsApiError(caught));
    } finally {
      setRevoking(false);
    }
  };

  const columns: Array<EuiBasicTableColumn<CredentialRow>> = [
    {
      field: 'environment',
      name: i18n.translate('xpack.featureFlagsManagement.apps.credentials.environmentColumnLabel', {
        defaultMessage: 'Environment',
      }),
      render: (environment: string, row: CredentialRow) => row.name || environment,
    },
    {
      name: i18n.translate('xpack.featureFlagsManagement.apps.credentials.clientIdColumnLabel', {
        defaultMessage: 'Client ID',
      }),
      render: (row: CredentialRow) =>
        row.credential ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiCode>{row.credential.client_id}</EuiCode>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={row.credential.client_id}>
                {(copy) => (
                  <EuiButtonEmpty
                    data-ebt-action="copyClientId"
                    data-ebt-element="featureFlagsManagement"
                    data-test-subj="featureFlagsManagementColumnsButton"
                    size="xs"
                    iconType="copy"
                    onClick={copy}
                    aria-label={i18n.translate(
                      'xpack.featureFlagsManagement.apps.credentials.copyClientIdAriaLabel',
                      { defaultMessage: 'Copy client ID' }
                    )}
                  >
                    {copyButtonLabel()}
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.featureFlagsManagement.apps.credentials.noCredentialLabel"
              defaultMessage="No key"
            />
          </EuiText>
        ),
    },
    {
      name: i18n.translate('xpack.featureFlagsManagement.apps.credentials.hintColumnLabel', {
        defaultMessage: 'SDK key hint',
      }),
      render: (row: CredentialRow) =>
        row.credential ? <EuiCode>{row.credential.sdk_key_hint}</EuiCode> : null,
    },
    ...(canSave
      ? [
          {
            name: i18n.translate(
              'xpack.featureFlagsManagement.apps.credentials.actionsColumnLabel',
              {
                defaultMessage: 'Actions',
              }
            ),
            render: (row: CredentialRow) =>
              row.credential ? (
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-ebt-action="rotateCredential"
                      data-ebt-element="featureFlagsManagement"
                      data-test-subj="featureFlagsManagementColumnsRotateButton"
                      size="s"
                      onClick={() => {
                        setRotateError(undefined);
                        setRotateClientId(false);
                        setRotateEnvironment(row.environment);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.featureFlagsManagement.apps.credentials.rotateButtonLabel"
                        defaultMessage="Rotate"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-ebt-action="deleteFlag"
                      data-ebt-element="featureFlagsManagement"
                      data-test-subj="featureFlagsManagementColumnsRevokeButton"
                      size="s"
                      color="danger"
                      onClick={() => {
                        setRevokeError(undefined);
                        setRevokeEnvironment(row.environment);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.featureFlagsManagement.apps.credentials.revokeButtonLabel"
                        defaultMessage="Revoke"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <EuiButton
                  data-ebt-action="rotateCredential"
                  data-ebt-element="featureFlagsManagement"
                  data-test-subj="featureFlagsManagementColumnsCreateKeyButton"
                  size="s"
                  onClick={() => {
                    setRotateError(undefined);
                    setRotateClientId(false);
                    setRotateEnvironment(row.environment);
                  }}
                >
                  <FormattedMessage
                    id="xpack.featureFlagsManagement.apps.credentials.createKeyButtonLabel"
                    defaultMessage="Create key"
                  />
                </EuiButton>
              ),
          } satisfies EuiBasicTableColumn<CredentialRow>,
        ]
      : []),
  ];

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.featureFlagsManagement.apps.credentials.title"
            defaultMessage="Credentials for {app}"
            values={{ app: appName }}
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.featureFlagsManagement.apps.credentials.description"
            defaultMessage="Each environment has one credential. The client ID can be copied later. The SDK key is shown only when you create or rotate it."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {(credentials.error || catalog.error || revokeError) && (
        <>
          {credentials.error && (
            <ApiErrorCallout error={credentials.error} onReload={credentials.reload} />
          )}
          {catalog.error && <ApiErrorCallout error={catalog.error} onReload={catalog.reload} />}
          {revokeError && <ApiErrorCallout error={revokeError} />}
          <EuiSpacer size="m" />
        </>
      )}
      {!catalog.loading && rows.length === 0 ? (
        <EuiEmptyPrompt
          iconType="key"
          title={
            <h3>
              <FormattedMessage
                id="xpack.featureFlagsManagement.apps.credentials.noEnvironmentsTitle"
                defaultMessage="Create an environment first"
              />
            </h3>
          }
          body={
            <FormattedMessage
              id="xpack.featureFlagsManagement.apps.credentials.noEnvironmentsDescription"
              defaultMessage="SDK keys are issued per environment."
            />
          }
        />
      ) : (
        <EuiBasicTable
          items={rows}
          columns={columns}
          itemId="environment"
          loading={credentials.loading || catalog.loading}
          tableCaption={i18n.translate(
            'xpack.featureFlagsManagement.apps.credentials.tableCaption',
            { defaultMessage: 'SDK keys for this app' }
          )}
        />
      )}
      {rotateEnvironment && (
        <EuiModal
          onClose={() => setRotateEnvironment(undefined)}
          aria-labelledby="featureFlagsRotateTitle"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="featureFlagsRotateTitle">
              {creating ? (
                <FormattedMessage
                  id="xpack.featureFlagsManagement.apps.credentials.createKeyTitle"
                  defaultMessage="Create SDK key for {environment}"
                  values={{ environment: rotateEnvironment }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.featureFlagsManagement.apps.credentials.rotateTitle"
                  defaultMessage="Rotate SDK key for {environment}"
                  values={{ environment: rotateEnvironment }}
                />
              )}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {rotateError && (
              <>
                <ApiErrorCallout error={rotateError} />
                <EuiSpacer size="m" />
              </>
            )}
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.featureFlagsManagement.apps.credentials.rotateDescription"
                  defaultMessage="The new SDK key is shown once. The previous key stops working after Fleet Server picks up the change."
                />
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiCheckbox
              id="featureFlagsRotateClientId"
              label={i18n.translate(
                'xpack.featureFlagsManagement.apps.credentials.rotateClientIdLabel',
                { defaultMessage: 'Also replace the client ID' }
              )}
              checked={rotateClientId}
              onChange={(event) => setRotateClientId(event.target.checked)}
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              data-ebt-action="cancel"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementCredentialsPanelButton"
              onClick={() => setRotateEnvironment(undefined)}
            >
              {cancelButtonLabel()}
            </EuiButtonEmpty>
            <EuiButton
              data-ebt-action="rotateCredential"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementCredentialsPanelButton"
              fill
              isLoading={rotating}
              onClick={() => void rotate()}
            >
              {creating ? (
                <FormattedMessage
                  id="xpack.featureFlagsManagement.apps.credentials.confirmCreateButtonLabel"
                  defaultMessage="Create key"
                />
              ) : (
                <FormattedMessage
                  id="xpack.featureFlagsManagement.apps.credentials.confirmRotateButtonLabel"
                  defaultMessage="Rotate key"
                />
              )}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
      {revealedKey && (
        <EuiModal
          onClose={() => setRevealedKey(undefined)}
          aria-labelledby="featureFlagsSdkKeyTitle"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="featureFlagsSdkKeyTitle">
              <FormattedMessage
                id="xpack.featureFlagsManagement.apps.credentials.sdkKeyTitle"
                defaultMessage="SDK key"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <KbnWarningCallout
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.featureFlagsManagement.apps.credentials.sdkKeyWarningTitle"
                  defaultMessage="Copy this key now"
                />
              }
              text={
                <FormattedMessage
                  id="xpack.featureFlagsManagement.apps.credentials.sdkKeyWarningDescription"
                  defaultMessage="This SDK key is shown only once. Kibana stores only a hash of it, so it cannot be displayed again."
                />
              }
            />
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem>
                <EuiFieldText
                  data-test-subj="featureFlagsManagementCredentialsPanelFieldText"
                  readOnly
                  fullWidth
                  value={revealedKey}
                  aria-label={i18n.translate(
                    'xpack.featureFlagsManagement.apps.credentials.sdkKeyAriaLabel',
                    { defaultMessage: 'SDK key' }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={revealedKey}>
                  {(copy) => (
                    <EuiButton
                      data-ebt-action="copyClientId"
                      data-ebt-element="featureFlagsManagement"
                      data-test-subj="featureFlagsManagementCredentialsPanelButton"
                      iconType="copy"
                      onClick={copy}
                    >
                      {copyButtonLabel()}
                    </EuiButton>
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton
              data-ebt-action="deleteFlag"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementCredentialsPanelButton"
              fill
              onClick={() => setRevealedKey(undefined)}
            >
              {closeButtonLabel()}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
      {revokeEnvironment && (
        <ConfirmDeleteModal
          title={i18n.translate('xpack.featureFlagsManagement.apps.credentials.revokeTitle', {
            defaultMessage: 'Revoke the key for {environment}?',
            values: { environment: revokeEnvironment },
          })}
          confirming={revoking}
          onCancel={() => setRevokeEnvironment(undefined)}
          onConfirm={() => {
            void revoke();
          }}
        >
          <FormattedMessage
            id="xpack.featureFlagsManagement.apps.credentials.revokeDescription"
            defaultMessage="The client ID and SDK key stop working after Fleet Server picks up the change."
          />
        </ConfirmDeleteModal>
      )}
    </>
  );
};
