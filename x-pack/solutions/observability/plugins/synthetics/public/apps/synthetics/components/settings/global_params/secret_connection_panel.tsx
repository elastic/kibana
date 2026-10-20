/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ClientPluginsStart } from '../../../../../plugin';
import type {
  SecretProviderType,
  VaultAuthMethod,
  SecretConnectionStatus,
} from '../../../../../../common/runtime_types';
import { SECRET_PROVIDER_HASHICORP_VAULT } from '../../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';

// Selectable secret-provider backends. Only HashiCorp Vault is implemented today;
// adding a provider means adding an option here and a matching field section below.
const PROVIDER_OPTIONS: Array<{ value: SecretProviderType; text: string }> = [
  { value: 'hashicorp_vault', text: 'HashiCorp Vault' },
];
const providerLabel = (type?: SecretProviderType) =>
  PROVIDER_OPTIONS.find((o) => o.value === type)?.text ?? type ?? 'HashiCorp Vault';

interface FormState {
  name: string;
  type: SecretProviderType;
  address: string;
  authMethod: VaultAuthMethod;
  namespace: string;
  kvMount: string;
  roleId: string;
  token: string;
  secretId: string;
  tlsSkipVerify: boolean;
  isNew: boolean;
  hasSecret: boolean;
}

const blankForm = (): FormState => ({
  name: '',
  type: SECRET_PROVIDER_HASHICORP_VAULT,
  address: '',
  authMethod: 'approle',
  namespace: '',
  kvMount: 'secret',
  roleId: '',
  token: '',
  secretId: '',
  tlsSkipVerify: false,
  isNew: true,
  hasSecret: false,
});

const toForm = (c: SecretConnectionStatus): FormState => ({
  name: c.name ?? '',
  type: c.type ?? SECRET_PROVIDER_HASHICORP_VAULT,
  address: c.config?.address ?? '',
  authMethod: c.config?.authMethod ?? 'approle',
  namespace: c.config?.namespace ?? '',
  kvMount: c.config?.kvMount ?? 'secret',
  roleId: c.config?.roleId ?? '',
  token: '',
  secretId: '',
  tlsSkipVerify: c.config?.tlsSkipVerify ?? false,
  isNew: false,
  hasSecret: c.hasSecret ?? false,
});

export const SecretConnectionPanel = () => {
  const { http, notifications, application } = useKibana<ClientPluginsStart>().services;
  const canManage = (application?.capabilities.uptime.canManageSecretConnections ??
    false) as boolean;

  const [connections, setConnections] = useState<SecretConnectionStatus[]>([]);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const accordionId = useGeneratedHtmlId({ prefix: 'secretConnections' });
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'secretConnectionFlyout' });

  const closeFlyout = () => setEditing(null);

  const load = useCallback(async () => {
    try {
      const res = await http.get<SecretConnectionStatus[]>(SYNTHETICS_API_URLS.SECRET_CONNECTION);
      setConnections(Array.isArray(res) ? res : []);
    } catch (e) {
      // Surface the failure rather than showing an empty list (which reads as
      // "no connections configured").
      notifications?.toasts.addError(e as Error, { title: LOAD_ERROR_TOAST });
    }
  }, [http, notifications]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setEditing((f) => (f ? { ...f, [key]: value } : f));
  };

  const onSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      // Provider-specific, non-secret settings.
      const config: Record<string, unknown> = {
        address: editing.address.trim(),
        authMethod: editing.authMethod,
        namespace: editing.namespace.trim() || undefined,
        kvMount: editing.kvMount.trim() || undefined,
        tlsSkipVerify: editing.tlsSkipVerify,
      };
      // Provider-specific secrets. Blank = keep the stored value (handled server-side).
      const secrets: Record<string, unknown> = {};
      if (editing.authMethod === 'token') {
        if (editing.token) secrets.token = editing.token;
      } else {
        config.roleId = editing.roleId.trim();
        if (editing.secretId) secrets.secretId = editing.secretId;
      }
      const body = {
        name: editing.name.trim(),
        type: editing.type,
        config,
        secrets,
      };
      await http.put(SYNTHETICS_API_URLS.SECRET_CONNECTION, { body: JSON.stringify(body) });
      notifications?.toasts.addSuccess(SAVED_TOAST);
      setEditing(null);
      await load();
    } catch (e) {
      notifications?.toasts.addError(e as Error, { title: SAVE_ERROR_TOAST });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (name: string) => {
    try {
      await http.delete(`${SYNTHETICS_API_URLS.SECRET_CONNECTION}/${encodeURIComponent(name)}`);
      await load();
    } catch (e) {
      notifications?.toasts.addError(e as Error, {
        title: DELETE_ERROR_TOAST,
        toastMessage: (e as IHttpFetchError<ResponseErrorBody>).body?.message,
      });
    }
  };

  const columns: Array<EuiBasicTableColumn<SecretConnectionStatus>> = [
    {
      field: 'name',
      name: NAME_LABEL,
      render: (n: string) => <EuiBadge iconType="lock">{n}</EuiBadge>,
    },
    {
      field: 'type',
      name: PROVIDER_LABEL,
      render: (ty?: SecretProviderType) => providerLabel(ty),
    },
    {
      name: ADDRESS_LABEL,
      render: (c: SecretConnectionStatus) => c.config?.address ?? '',
    },
    {
      name: AUTH_METHOD_LABEL,
      render: (c: SecretConnectionStatus) => c.config?.authMethod ?? '',
    },
    {
      name: ACTIONS_LABEL,
      actions: [
        {
          name: EDIT_LABEL,
          description: EDIT_LABEL,
          icon: 'pencil',
          type: 'icon',
          onClick: (c: SecretConnectionStatus) => setEditing(toForm(c)),
          enabled: () => canManage,
        },
        {
          name: DELETE_LABEL,
          description: DELETE_LABEL,
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          // Confirm before deleting (and never issue a delete for an empty name).
          onClick: (c: SecretConnectionStatus) => {
            if (c.name) setDeleteTarget(c.name);
          },
          enabled: () => canManage,
        },
      ],
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiAccordion
        id={accordionId}
        initialIsOpen={connections.length === 0}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{TITLE}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={connections.length ? 'success' : 'hollow'}>
                {i18n.translate('xpack.synthetics.secretConnection.count', {
                  defaultMessage: '{n} connected',
                  values: { n: connections.length },
                })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {DESCRIPTION}
        </EuiText>
        <EuiSpacer size="m" />

        {connections.length > 0 && (
          <>
            <EuiBasicTable
              tableCaption={TITLE}
              items={connections}
              columns={columns}
              itemId="name"
            />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="plusCircle"
              data-test-subj="syntheticsVaultAddConnection"
              isDisabled={!canManage || !!editing}
              onClick={() => setEditing(blankForm())}
            >
              {ADD_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        {editing && (
          <EuiFlyout
            ownFocus
            size="m"
            onClose={closeFlyout}
            aria-labelledby={flyoutTitleId}
            data-test-subj="syntheticsSecretConnectionFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id={flyoutTitleId}>{editing.isNew ? ADD_LABEL : EDIT_TITLE}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiForm
                component="form"
                onSubmit={(e) => {
                  // Without this, pressing Enter triggers a native form submit that
                  // reloads the page and discards the typed secret.
                  e.preventDefault();
                  if (editing.name && editing.address && !saving) onSave();
                }}
              >
                <EuiFormRow fullWidth label={PROVIDER_LABEL} helpText={PROVIDER_HELP}>
                  {PROVIDER_OPTIONS.length === 1 ? (
                    <EuiText size="s" data-test-subj="syntheticsVaultProvider">
                      <strong>{providerLabel(editing.type)}</strong>
                    </EuiText>
                  ) : (
                    <EuiSelect
                      fullWidth
                      data-test-subj="syntheticsVaultProvider"
                      value={editing.type}
                      options={PROVIDER_OPTIONS}
                      disabled={!editing.isNew}
                      onChange={(e) => set('type', e.target.value as SecretProviderType)}
                    />
                  )}
                </EuiFormRow>
                <EuiSpacer size="l" />
                {/* Fields below are the HashiCorp Vault provider's. When another
                    provider is added, render its own field section keyed on
                    editing.type. */}
                <EuiFormRow fullWidth label={NAME_LABEL} helpText={NAME_HELP}>
                  <EuiFieldText
                    fullWidth
                    data-test-subj="syntheticsVaultName"
                    disabled={!editing.isNew}
                    value={editing.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiFlexGroup gutterSize="m" alignItems="flexStart">
                  <EuiFlexItem grow={2}>
                    <EuiFormRow fullWidth label={ADDRESS_LABEL}>
                      <EuiFieldText
                        fullWidth
                        data-test-subj="syntheticsVaultAddress"
                        placeholder="https://vault.internal:8200"
                        value={editing.address}
                        onChange={(e) => set('address', e.target.value)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>
                    <EuiFormRow fullWidth label={KV_MOUNT_LABEL}>
                      <EuiFieldText
                        fullWidth
                        data-test-subj="syntheticsVaultKvMount"
                        value={editing.kvMount}
                        onChange={(e) => set('kvMount', e.target.value)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFormRow fullWidth label={AUTH_METHOD_LABEL}>
                  <EuiSelect
                    fullWidth
                    data-test-subj="syntheticsVaultAuthMethod"
                    value={editing.authMethod}
                    options={[
                      { value: 'approle', text: 'AppRole' },
                      { value: 'token', text: 'Token' },
                    ]}
                    onChange={(e) => set('authMethod', e.target.value as VaultAuthMethod)}
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                {editing.authMethod === 'token' ? (
                  <EuiFormRow
                    fullWidth
                    label={TOKEN_LABEL}
                    helpText={editing.hasSecret ? SECRET_SAVED_HELP : undefined}
                  >
                    <EuiFieldPassword
                      fullWidth
                      type="dual"
                      data-test-subj="syntheticsVaultToken"
                      placeholder={editing.hasSecret ? '••••••••' : ''}
                      value={editing.token}
                      onChange={(e) => set('token', e.target.value)}
                    />
                  </EuiFormRow>
                ) : (
                  <EuiFlexGroup gutterSize="m" alignItems="flexStart">
                    <EuiFlexItem>
                      <EuiFormRow fullWidth label={ROLE_ID_LABEL}>
                        <EuiFieldText
                          fullWidth
                          data-test-subj="syntheticsVaultRoleId"
                          value={editing.roleId}
                          onChange={(e) => set('roleId', e.target.value)}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow
                        fullWidth
                        label={SECRET_ID_LABEL}
                        helpText={editing.hasSecret ? SECRET_SAVED_HELP : undefined}
                      >
                        <EuiFieldPassword
                          fullWidth
                          type="dual"
                          data-test-subj="syntheticsVaultSecretId"
                          placeholder={editing.hasSecret ? '••••••••' : ''}
                          value={editing.secretId}
                          onChange={(e) => set('secretId', e.target.value)}
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
                <EuiSpacer size="l" />
                <EuiFormRow fullWidth helpText={TLS_SKIP_HELP}>
                  <EuiSwitch
                    label={TLS_SKIP_LABEL}
                    data-test-subj="syntheticsVaultTlsSkip"
                    checked={editing.tlsSkipVerify}
                    onChange={(e) => set('tlsSkipVerify', e.target.checked)}
                  />
                </EuiFormRow>
                <EuiSpacer size="l" />
                <KbnWarningCallout size="s" title={ACCESS_NOTE_TITLE}>
                  {ACCESS_NOTE}
                </KbnWarningCallout>
              </EuiForm>
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="cross"
                    flush="left"
                    data-test-subj="syntheticsSecretConnectionPanelButton"
                    onClick={closeFlyout}
                  >
                    {CANCEL_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    data-test-subj="syntheticsVaultSaveConnection"
                    isLoading={saving}
                    isDisabled={!editing.name || !editing.address}
                    onClick={onSave}
                  >
                    {SAVE_LABEL}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>
        )}
      </EuiAccordion>
      {deleteTarget && (
        <EuiConfirmModal
          title={DELETE_CONFIRM_TITLE}
          aria-label={DELETE_CONFIRM_TITLE}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const name = deleteTarget;
            setDeleteTarget(null);
            await onDelete(name);
          }}
          cancelButtonText={CANCEL_LABEL}
          confirmButtonText={DELETE_LABEL}
          buttonColor="danger"
          data-test-subj="syntheticsVaultDeleteConfirm"
        >
          <p>
            {i18n.translate('xpack.synthetics.secretConnection.deleteConfirmBody', {
              defaultMessage:
                'Delete the Vault connection "{name}"? A connection can only be deleted once no parameter or monitor references it.',
              values: { name: deleteTarget },
            })}
          </p>
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
};

const TITLE = i18n.translate('xpack.synthetics.secretConnection.title', {
  defaultMessage: 'HashiCorp Vault connections',
});
const DESCRIPTION = i18n.translate('xpack.synthetics.secretConnection.description', {
  defaultMessage:
    "Connect one or more HashiCorp Vault accounts. Connections are stored encrypted and propagated to your private-location agents (Heartbeat), which resolve vault-backed parameters at runtime. Secret values never leave Vault's trust boundary. Reference a secret from a parameter value as {reference}. Requires Elastic Agent 9.6 or later on your private locations.",
  values: { reference: 'vault://<connection>@<path>#<field>' },
});
const PROVIDER_LABEL = i18n.translate('xpack.synthetics.secretConnection.provider', {
  defaultMessage: 'Provider',
});
const PROVIDER_HELP = i18n.translate('xpack.synthetics.secretConnection.providerHelp', {
  defaultMessage: 'The secret-management backend this connection resolves secrets from.',
});
const NAME_LABEL = i18n.translate('xpack.synthetics.secretConnection.name', {
  defaultMessage: 'Name',
});
const NAME_HELP = i18n.translate('xpack.synthetics.secretConnection.nameHelp', {
  defaultMessage: 'Referenced by params, e.g. "prod". Cannot be changed after creation.',
});
const ADDRESS_LABEL = i18n.translate('xpack.synthetics.secretConnection.address', {
  defaultMessage: 'Vault address',
});
const AUTH_METHOD_LABEL = i18n.translate('xpack.synthetics.secretConnection.authMethod', {
  defaultMessage: 'Auth method',
});
const KV_MOUNT_LABEL = i18n.translate('xpack.synthetics.secretConnection.kvMount', {
  defaultMessage: 'KV v2 mount',
});
const TOKEN_LABEL = i18n.translate('xpack.synthetics.secretConnection.token', {
  defaultMessage: 'Token',
});
const ROLE_ID_LABEL = i18n.translate('xpack.synthetics.secretConnection.roleId', {
  defaultMessage: 'Role ID',
});
const SECRET_ID_LABEL = i18n.translate('xpack.synthetics.secretConnection.secretId', {
  defaultMessage: 'Secret ID',
});
const TLS_SKIP_LABEL = i18n.translate('xpack.synthetics.secretConnection.tlsSkip', {
  defaultMessage: 'Skip TLS verification (dev only)',
});
const TLS_SKIP_HELP = i18n.translate('xpack.synthetics.secretConnection.tlsSkipHelp', {
  defaultMessage: 'Disables certificate validation. Use only against development Vault servers.',
});
const SECRET_SAVED_HELP = i18n.translate('xpack.synthetics.secretConnection.secretSaved', {
  defaultMessage: 'A secret is already stored. Leave blank to keep it.',
});
const ACTIONS_LABEL = i18n.translate('xpack.synthetics.secretConnection.actions', {
  defaultMessage: 'Actions',
});
const ADD_LABEL = i18n.translate('xpack.synthetics.secretConnection.add', {
  defaultMessage: 'Add connection',
});
const EDIT_TITLE = i18n.translate('xpack.synthetics.secretConnection.editTitle', {
  defaultMessage: 'Edit connection',
});
const EDIT_LABEL = i18n.translate('xpack.synthetics.secretConnection.edit', {
  defaultMessage: 'Edit',
});
const DELETE_LABEL = i18n.translate('xpack.synthetics.secretConnection.delete', {
  defaultMessage: 'Delete',
});
const SAVE_LABEL = i18n.translate('xpack.synthetics.secretConnection.save', {
  defaultMessage: 'Save connection',
});
const CANCEL_LABEL = i18n.translate('xpack.synthetics.secretConnection.cancel', {
  defaultMessage: 'Cancel',
});
const ACCESS_NOTE_TITLE = i18n.translate('xpack.synthetics.secretConnection.accessNoteTitle', {
  defaultMessage: 'Use a dedicated, least-privilege credential',
});
const ACCESS_NOTE = i18n.translate('xpack.synthetics.secretConnection.accessNote', {
  defaultMessage:
    'Anyone who can edit monitors or global parameters in this space can reference any secret this credential can read. Use a token or AppRole that can only read the paths your monitors need.',
});
const SAVED_TOAST = i18n.translate('xpack.synthetics.secretConnection.savedToast', {
  defaultMessage: 'Vault connection saved',
});
const SAVE_ERROR_TOAST = i18n.translate('xpack.synthetics.secretConnection.saveErrorToast', {
  defaultMessage: 'Failed to save Vault connection',
});
const DELETE_ERROR_TOAST = i18n.translate('xpack.synthetics.secretConnection.deleteErrorToast', {
  defaultMessage: 'Failed to delete Vault connection',
});
const DELETE_CONFIRM_TITLE = i18n.translate(
  'xpack.synthetics.secretConnection.deleteConfirmTitle',
  {
    defaultMessage: 'Delete Vault connection?',
  }
);
const LOAD_ERROR_TOAST = i18n.translate('xpack.synthetics.secretConnection.loadErrorToast', {
  defaultMessage: 'Failed to load Vault connections',
});
