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
  EuiButton,
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
import { FormattedMessage } from '@kbn/i18n-react';
import type { ClientPluginsStart } from '../../../../../plugin';
import type {
  VaultAuthMethod,
  VaultConnectionStatus,
} from '../../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../../common/constants';

interface FormState {
  address: string;
  authMethod: VaultAuthMethod;
  namespace: string;
  kvMount: string;
  roleId: string;
  token: string;
  secretId: string;
  tlsSkipVerify: boolean;
}

const emptyForm: FormState = {
  address: '',
  authMethod: 'approle',
  namespace: '',
  kvMount: 'secret',
  roleId: '',
  token: '',
  secretId: '',
  tlsSkipVerify: false,
};

export const VaultConnectionPanel = () => {
  const { http, notifications, application } = useKibana<ClientPluginsStart>().services;
  const canSave = (application?.capabilities.uptime.save ?? false) as boolean;

  const [status, setStatus] = useState<VaultConnectionStatus | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const accordionId = useGeneratedHtmlId({ prefix: 'vaultConnection' });

  const load = useCallback(async () => {
    try {
      const res = await http.get<VaultConnectionStatus>(SYNTHETICS_API_URLS.VAULT_CONNECTION);
      setStatus(res);
      if (res.configured) {
        setForm((f) => ({
          ...f,
          address: res.address ?? '',
          authMethod: res.authMethod ?? 'approle',
          namespace: res.namespace ?? '',
          kvMount: res.kvMount ?? 'secret',
          roleId: res.roleId ?? '',
          tlsSkipVerify: res.tlsSkipVerify ?? false,
          token: '',
          secretId: '',
        }));
      }
    } catch (e) {
      // non-fatal for the params page
    }
  }, [http]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        address: form.address.trim(),
        authMethod: form.authMethod,
        namespace: form.namespace.trim() || undefined,
        kvMount: form.kvMount.trim() || undefined,
        tlsSkipVerify: form.tlsSkipVerify,
      };
      if (form.authMethod === 'token') {
        if (form.token) body.token = form.token;
      } else {
        body.roleId = form.roleId.trim();
        if (form.secretId) body.secretId = form.secretId;
      }
      const res = await http.put<VaultConnectionStatus>(SYNTHETICS_API_URLS.VAULT_CONNECTION, {
        body: JSON.stringify(body),
      });
      setStatus(res);
      setForm((f) => ({ ...f, token: '', secretId: '' }));
      notifications?.toasts.addSuccess(SAVED_TOAST);
    } catch (e) {
      notifications?.toasts.addError(e as Error, { title: SAVE_ERROR_TOAST });
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = status?.configured ? (
    <EuiBadge color="success" iconType="check">
      {i18n.translate('xpack.synthetics.vaultConnection.connectedBadge', {
        defaultMessage: 'Connected: {address}',
        values: { address: status.address ?? '' },
      })}
    </EuiBadge>
  ) : (
    <EuiBadge color="hollow">
      {i18n.translate('xpack.synthetics.vaultConnection.notConnectedBadge', {
        defaultMessage: 'Not connected',
      })}
    </EuiBadge>
  );

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiAccordion
        id={accordionId}
        initialIsOpen={!status?.configured}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{TITLE}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{statusBadge}</EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.synthetics.vaultConnection.description"
            defaultMessage="Connect a HashiCorp Vault account. The connection is stored encrypted and propagated to your private-location agents (Heartbeat), which resolve vault-backed parameters at runtime. The secret values never leave Vault's trust boundary."
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm component="form">
          <EuiFormRow fullWidth label={ADDRESS_LABEL} helpText={ADDRESS_HELP}>
            <EuiFieldText
              fullWidth
              data-test-subj="syntheticsVaultAddress"
              placeholder="https://vault.internal:8200"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </EuiFormRow>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow fullWidth label={AUTH_METHOD_LABEL}>
                <EuiSelect
                  fullWidth
                  data-test-subj="syntheticsVaultAuthMethod"
                  value={form.authMethod}
                  options={[
                    { value: 'approle', text: 'AppRole' },
                    { value: 'token', text: 'Token' },
                  ]}
                  onChange={(e) => set('authMethod', e.target.value as VaultAuthMethod)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow fullWidth label={KV_MOUNT_LABEL} helpText={KV_MOUNT_HELP}>
                <EuiFieldText
                  fullWidth
                  data-test-subj="syntheticsVaultKvMount"
                  value={form.kvMount}
                  onChange={(e) => set('kvMount', e.target.value)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          {form.authMethod === 'token' ? (
            <EuiFormRow
              fullWidth
              label={TOKEN_LABEL}
              helpText={status?.hasSecret ? SECRET_SAVED_HELP : undefined}
            >
              <EuiFieldPassword
                fullWidth
                type="dual"
                data-test-subj="syntheticsVaultToken"
                placeholder={status?.hasSecret ? '••••••••' : ''}
                value={form.token}
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
                    value={form.roleId}
                    onChange={(e) => set('roleId', e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={SECRET_ID_LABEL}
                  helpText={status?.hasSecret ? SECRET_SAVED_HELP : undefined}
                >
                  <EuiFieldPassword
                    fullWidth
                    type="dual"
                    data-test-subj="syntheticsVaultSecretId"
                    placeholder={status?.hasSecret ? '••••••••' : ''}
                    value={form.secretId}
                    onChange={(e) => set('secretId', e.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          <EuiFormRow fullWidth label={NAMESPACE_LABEL} helpText={NAMESPACE_HELP}>
            <EuiFieldText
              fullWidth
              data-test-subj="syntheticsVaultNamespace"
              value={form.namespace}
              onChange={(e) => set('namespace', e.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth>
            <EuiSwitch
              label={TLS_SKIP_LABEL}
              data-test-subj="syntheticsVaultTlsSkip"
              checked={form.tlsSkipVerify}
              onChange={(e) => set('tlsSkipVerify', e.target.checked)}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiButton
            fill
            data-test-subj="syntheticsVaultSaveConnection"
            isLoading={saving}
            isDisabled={!canSave || !form.address}
            onClick={onSave}
          >
            {status?.configured ? UPDATE_BUTTON : CONNECT_BUTTON}
          </EuiButton>
        </EuiForm>
      </EuiAccordion>
    </EuiPanel>
  );
};

const TITLE = i18n.translate('xpack.synthetics.vaultConnection.title', {
  defaultMessage: 'HashiCorp Vault connection',
});
const ADDRESS_LABEL = i18n.translate('xpack.synthetics.vaultConnection.address', {
  defaultMessage: 'Vault address',
});
const ADDRESS_HELP = i18n.translate('xpack.synthetics.vaultConnection.addressHelp', {
  defaultMessage: 'Base URL of your Vault server.',
});
const AUTH_METHOD_LABEL = i18n.translate('xpack.synthetics.vaultConnection.authMethod', {
  defaultMessage: 'Authentication method',
});
const KV_MOUNT_LABEL = i18n.translate('xpack.synthetics.vaultConnection.kvMount', {
  defaultMessage: 'KV v2 mount',
});
const KV_MOUNT_HELP = i18n.translate('xpack.synthetics.vaultConnection.kvMountHelp', {
  defaultMessage: 'Secrets engine mount path (default "secret").',
});
const TOKEN_LABEL = i18n.translate('xpack.synthetics.vaultConnection.token', {
  defaultMessage: 'Token',
});
const ROLE_ID_LABEL = i18n.translate('xpack.synthetics.vaultConnection.roleId', {
  defaultMessage: 'Role ID',
});
const SECRET_ID_LABEL = i18n.translate('xpack.synthetics.vaultConnection.secretId', {
  defaultMessage: 'Secret ID',
});
const NAMESPACE_LABEL = i18n.translate('xpack.synthetics.vaultConnection.namespace', {
  defaultMessage: 'Vault namespace',
});
const NAMESPACE_HELP = i18n.translate('xpack.synthetics.vaultConnection.namespaceHelp', {
  defaultMessage: 'Optional. Vault Enterprise namespace.',
});
const TLS_SKIP_LABEL = i18n.translate('xpack.synthetics.vaultConnection.tlsSkip', {
  defaultMessage: 'Skip TLS verification (dev only)',
});
const SECRET_SAVED_HELP = i18n.translate('xpack.synthetics.vaultConnection.secretSaved', {
  defaultMessage: 'A secret is already stored. Leave blank to keep it.',
});
const CONNECT_BUTTON = i18n.translate('xpack.synthetics.vaultConnection.connect', {
  defaultMessage: 'Connect',
});
const UPDATE_BUTTON = i18n.translate('xpack.synthetics.vaultConnection.update', {
  defaultMessage: 'Update connection',
});
const SAVED_TOAST = i18n.translate('xpack.synthetics.vaultConnection.savedToast', {
  defaultMessage: 'Vault connection saved',
});
const SAVE_ERROR_TOAST = i18n.translate('xpack.synthetics.vaultConnection.saveErrorToast', {
  defaultMessage: 'Failed to save Vault connection',
});
