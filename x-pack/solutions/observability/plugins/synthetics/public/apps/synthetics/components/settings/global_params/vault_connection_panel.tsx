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
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ClientPluginsStart } from '../../../../../plugin';
import type {
  SecretProviderType,
  VaultAuthMethod,
  VaultConnectionStatus,
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
  secretRefreshInterval: string;
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
  secretRefreshInterval: '5m',
  roleId: '',
  token: '',
  secretId: '',
  tlsSkipVerify: false,
  isNew: true,
  hasSecret: false,
});

const toForm = (c: VaultConnectionStatus): FormState => ({
  name: c.name ?? '',
  type: c.type ?? SECRET_PROVIDER_HASHICORP_VAULT,
  address: c.config?.address ?? '',
  authMethod: c.config?.authMethod ?? 'approle',
  namespace: c.config?.namespace ?? '',
  kvMount: c.config?.kvMount ?? 'secret',
  secretRefreshInterval: c.secretRefreshInterval ?? '5m',
  roleId: c.config?.roleId ?? '',
  token: '',
  secretId: '',
  tlsSkipVerify: c.config?.tlsSkipVerify ?? false,
  isNew: false,
  hasSecret: c.hasSecret ?? false,
});

export const VaultConnectionPanel = () => {
  const { http, notifications, application } = useKibana<ClientPluginsStart>().services;
  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const [connections, setConnections] = useState<VaultConnectionStatus[]>([]);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const accordionId = useGeneratedHtmlId({ prefix: 'vaultConnections' });

  const load = useCallback(async () => {
    try {
      const res = await http.get<VaultConnectionStatus[]>(SYNTHETICS_API_URLS.VAULT_CONNECTION);
      setConnections(Array.isArray(res) ? res : []);
    } catch (e) {
      // non-fatal for the params page
    }
  }, [http]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setEditing((f) => (f ? { ...f, [key]: value } : f));

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
        secretRefreshInterval: editing.secretRefreshInterval.trim() || undefined,
        config,
        secrets,
      };
      await http.put(SYNTHETICS_API_URLS.VAULT_CONNECTION, { body: JSON.stringify(body) });
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
      await http.delete(`${SYNTHETICS_API_URLS.VAULT_CONNECTION}/${encodeURIComponent(name)}`);
      await load();
    } catch (e) {
      notifications?.toasts.addError(e as Error, { title: DELETE_ERROR_TOAST });
    }
  };

  const onRefreshAll = async () => {
    setRefreshing(true);
    try {
      await http.post(`${SYNTHETICS_API_URLS.VAULT_CONNECTION}/_refresh`);
      notifications?.toasts.addSuccess(REFRESHED_TOAST);
      await load();
    } catch (e) {
      notifications?.toasts.addError(e as Error, { title: REFRESH_ERROR_TOAST });
    } finally {
      setRefreshing(false);
    }
  };

  const columns: Array<EuiBasicTableColumn<VaultConnectionStatus>> = [
    {
      field: 'name',
      name: NAME_LABEL,
      render: (n: string) => <EuiBadge iconType="lock">{n}</EuiBadge>,
    },
    {
      field: 'type',
      name: TYPE_LABEL,
      render: (ty?: SecretProviderType) => providerLabel(ty),
    },
    {
      name: ADDRESS_LABEL,
      render: (c: VaultConnectionStatus) => c.config?.address ?? '',
    },
    {
      name: AUTH_METHOD_LABEL,
      render: (c: VaultConnectionStatus) => c.config?.authMethod ?? '',
    },
    {
      field: 'secretRefreshInterval',
      name: REFRESH_INTERVAL_LABEL,
      render: (v?: string) => v ?? '5m',
    },
    {
      name: ACTIONS_LABEL,
      actions: [
        {
          name: EDIT_LABEL,
          description: EDIT_LABEL,
          icon: 'pencil',
          type: 'icon',
          onClick: (c: VaultConnectionStatus) => setEditing(toForm(c)),
          enabled: () => canSave,
        },
        {
          name: DELETE_LABEL,
          description: DELETE_LABEL,
          icon: 'trash',
          color: 'danger',
          type: 'icon',
          onClick: (c: VaultConnectionStatus) => onDelete(c.name ?? ''),
          enabled: () => canSave,
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
                {i18n.translate('xpack.synthetics.vaultConnection.count', {
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
              iconType="plusInCircle"
              data-test-subj="syntheticsVaultAddConnection"
              isDisabled={!canSave || !!editing}
              onClick={() => setEditing(blankForm())}
            >
              {ADD_LABEL}
            </EuiButton>
          </EuiFlexItem>
          {connections.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="refresh"
                data-test-subj="syntheticsVaultRefreshSecrets"
                isLoading={refreshing}
                isDisabled={!canSave}
                onClick={onRefreshAll}
              >
                {REFRESH_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {editing && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder paddingSize="m" color="subdued">
              <EuiForm component="form">
                <EuiFormRow fullWidth label={PROVIDER_LABEL} helpText={PROVIDER_HELP}>
                  <EuiSelect
                    fullWidth
                    data-test-subj="syntheticsVaultProvider"
                    value={editing.type}
                    options={PROVIDER_OPTIONS}
                    disabled={!editing.isNew || PROVIDER_OPTIONS.length === 1}
                    onChange={(e) => set('type', e.target.value as SecretProviderType)}
                  />
                </EuiFormRow>
                {/* Fields below are the HashiCorp Vault provider's. When another
                    provider is added, render its own field section keyed on
                    editing.type. */}
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow fullWidth label={NAME_LABEL} helpText={NAME_HELP}>
                      <EuiFieldText
                        fullWidth
                        data-test-subj="syntheticsVaultName"
                        disabled={!editing.isNew}
                        value={editing.name}
                        onChange={(e) => set('name', e.target.value)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
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
                </EuiFlexGroup>
                <EuiFlexGroup>
                  <EuiFlexItem>
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
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow fullWidth label={KV_MOUNT_LABEL}>
                      <EuiFieldText
                        fullWidth
                        data-test-subj="syntheticsVaultKvMount"
                        value={editing.kvMount}
                        onChange={(e) => set('kvMount', e.target.value)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      fullWidth
                      label={REFRESH_INTERVAL_LABEL}
                      helpText={REFRESH_INTERVAL_HELP}
                    >
                      <EuiFieldText
                        fullWidth
                        data-test-subj="syntheticsVaultRefreshInterval"
                        placeholder="5m"
                        value={editing.secretRefreshInterval}
                        onChange={(e) => set('secretRefreshInterval', e.target.value)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
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
                  <EuiFlexGroup>
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
                <EuiFormRow fullWidth>
                  <EuiSwitch
                    label={TLS_SKIP_LABEL}
                    data-test-subj="syntheticsVaultTlsSkip"
                    checked={editing.tlsSkipVerify}
                    onChange={(e) => set('tlsSkipVerify', e.target.checked)}
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiFlexGroup gutterSize="s" responsive={false}>
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
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="syntheticsVaultConnectionPanelButton"
                      onClick={() => setEditing(null)}
                    >
                      {CANCEL_LABEL}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiForm>
            </EuiPanel>
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};

const TITLE = i18n.translate('xpack.synthetics.vaultConnection.title', {
  defaultMessage: 'HashiCorp Vault connections',
});
const DESCRIPTION = i18n.translate('xpack.synthetics.vaultConnection.description', {
  defaultMessage:
    "Connect one or more HashiCorp Vault accounts. Connections are stored encrypted and propagated to your private-location agents (Heartbeat), which resolve vault-backed parameters at runtime. Secret values never leave Vault's trust boundary. Reference a connection from a parameter by its name.",
});
const PROVIDER_LABEL = i18n.translate('xpack.synthetics.vaultConnection.provider', {
  defaultMessage: 'Provider',
});
const PROVIDER_HELP = i18n.translate('xpack.synthetics.vaultConnection.providerHelp', {
  defaultMessage: 'The secret-management backend this connection resolves secrets from.',
});
const TYPE_LABEL = i18n.translate('xpack.synthetics.vaultConnection.type', {
  defaultMessage: 'Provider',
});
const NAME_LABEL = i18n.translate('xpack.synthetics.vaultConnection.name', {
  defaultMessage: 'Name',
});
const NAME_HELP = i18n.translate('xpack.synthetics.vaultConnection.nameHelp', {
  defaultMessage: 'Referenced by params, e.g. "prod". Cannot be changed after creation.',
});
const ADDRESS_LABEL = i18n.translate('xpack.synthetics.vaultConnection.address', {
  defaultMessage: 'Vault address',
});
const AUTH_METHOD_LABEL = i18n.translate('xpack.synthetics.vaultConnection.authMethod', {
  defaultMessage: 'Auth method',
});
const KV_MOUNT_LABEL = i18n.translate('xpack.synthetics.vaultConnection.kvMount', {
  defaultMessage: 'KV v2 mount',
});
const REFRESH_INTERVAL_LABEL = i18n.translate('xpack.synthetics.vaultConnection.refreshInterval', {
  defaultMessage: 'Secret refresh interval',
});
const REFRESH_INTERVAL_HELP = i18n.translate(
  'xpack.synthetics.vaultConnection.refreshIntervalHelp',
  {
    defaultMessage: 'How long the agent caches a resolved secret, e.g. "5m", "1h".',
  }
);
const TOKEN_LABEL = i18n.translate('xpack.synthetics.vaultConnection.token', {
  defaultMessage: 'Token',
});
const ROLE_ID_LABEL = i18n.translate('xpack.synthetics.vaultConnection.roleId', {
  defaultMessage: 'Role ID',
});
const SECRET_ID_LABEL = i18n.translate('xpack.synthetics.vaultConnection.secretId', {
  defaultMessage: 'Secret ID',
});
const TLS_SKIP_LABEL = i18n.translate('xpack.synthetics.vaultConnection.tlsSkip', {
  defaultMessage: 'Skip TLS verification (dev only)',
});
const SECRET_SAVED_HELP = i18n.translate('xpack.synthetics.vaultConnection.secretSaved', {
  defaultMessage: 'A secret is already stored. Leave blank to keep it.',
});
const ACTIONS_LABEL = i18n.translate('xpack.synthetics.vaultConnection.actions', {
  defaultMessage: 'Actions',
});
const ADD_LABEL = i18n.translate('xpack.synthetics.vaultConnection.add', {
  defaultMessage: 'Add connection',
});
const EDIT_LABEL = i18n.translate('xpack.synthetics.vaultConnection.edit', {
  defaultMessage: 'Edit',
});
const DELETE_LABEL = i18n.translate('xpack.synthetics.vaultConnection.delete', {
  defaultMessage: 'Delete',
});
const SAVE_LABEL = i18n.translate('xpack.synthetics.vaultConnection.save', {
  defaultMessage: 'Save connection',
});
const CANCEL_LABEL = i18n.translate('xpack.synthetics.vaultConnection.cancel', {
  defaultMessage: 'Cancel',
});
const REFRESH_BUTTON = i18n.translate('xpack.synthetics.vaultConnection.refreshButton', {
  defaultMessage: 'Refresh secrets',
});
const SAVED_TOAST = i18n.translate('xpack.synthetics.vaultConnection.savedToast', {
  defaultMessage: 'Vault connection saved',
});
const SAVE_ERROR_TOAST = i18n.translate('xpack.synthetics.vaultConnection.saveErrorToast', {
  defaultMessage: 'Failed to save Vault connection',
});
const DELETE_ERROR_TOAST = i18n.translate('xpack.synthetics.vaultConnection.deleteErrorToast', {
  defaultMessage: 'Failed to delete Vault connection',
});
const REFRESHED_TOAST = i18n.translate('xpack.synthetics.vaultConnection.refreshedToast', {
  defaultMessage: 'Refreshing secrets — configs are being re-pushed to agents',
});
const REFRESH_ERROR_TOAST = i18n.translate('xpack.synthetics.vaultConnection.refreshErrorToast', {
  defaultMessage: 'Failed to refresh Vault secrets',
});
