/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  MAX_SANDBOX_ALLOWLIST_HOSTS,
  validateSandboxAllowlist,
} from '@kbn/nightshift-investigations-plugin/common';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { SettingsSectionRow } from '../settings_section';
import { useFetchSandboxAllowlist } from './use_fetch_sandbox_allowlist';
import { useSaveSandboxAllowlist } from './use_save_sandbox_allowlist';

/** One host or egress firewall rule per line. */
export const parseSandboxAllowlistText = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const formatHosts = (hosts: readonly string[]): string => hosts.join('\n');

/** Admin-only editor for the per-space sandbox egress firewall allowlist. */
export const SandboxAllowlistSection = () => {
  const { data, isLoading, error } = useFetchSandboxAllowlist();
  const { mutateAsync, isLoading: isSaving } = useSaveSandboxAllowlist();
  // `undefined` while untouched, so a refetch (e.g. after a save or a conflict) shows the server state.
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const savedText = formatHosts(data?.hosts ?? []);
  const text = draft ?? savedText;
  const { hosts, errors } = useMemo(
    () => validateSandboxAllowlist(parseSandboxAllowlistText(text)),
    [text]
  );
  const isDirty = draft !== undefined && formatHosts(hosts) !== savedText;
  const isInvalid = errors.length > 0;

  const save = async () => {
    try {
      await mutateAsync({ hosts });
      setDraft(undefined);
    } catch {
      // The mutation hook already shows a toast; keep the draft so nothing typed is lost.
    }
  };

  return (
    <SettingsSectionRow
      title={i18n.translate('xpack.nightshift.settings.sandboxAllowlistTitle', {
        defaultMessage: 'Sandbox egress allowlist',
      })}
      description={
        <>
          <p>
            {i18n.translate('xpack.nightshift.settings.sandboxAllowlistDescription', {
              defaultMessage:
                'Outbound destinations and egress firewall rules permitted for sandbox commands in this space. Active connector hosts are included automatically.',
            })}
          </p>
          <p>
            {i18n.translate('xpack.nightshift.settings.sandboxAllowlistWildcardNote', {
              defaultMessage:
                'Enter one hostname or rule per line (e.g. api.github.com, *.datadoghq.com, pypi.org GET,HEAD /simple/, or deny api.github.com POST /gists). At most {max} rules.',
              values: { max: MAX_SANDBOX_ALLOWLIST_HOSTS },
            })}
          </p>
        </>
      }
      data-test-subj="nightshiftSandboxAllowlistSection"
    >
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : error ? (
        <KbnDangerCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.nightshift.settings.sandboxAllowlistLoadError', {
            defaultMessage: 'Failed to load the sandbox egress allowlist',
          })}
          text={error.message}
          data-test-subj="nightshiftSandboxAllowlistLoadError"
        />
      ) : (
        <>
          <EuiFormRow
            fullWidth
            isInvalid={isInvalid}
            error={errors}
            helpText={i18n.translate('xpack.nightshift.settings.sandboxAllowlistCount', {
              defaultMessage: '{count} of {max} rules',
              values: { count: hosts.length, max: MAX_SANDBOX_ALLOWLIST_HOSTS },
            })}
            label={i18n.translate('xpack.nightshift.settings.sandboxAllowlistLabel', {
              defaultMessage: 'Allowed hosts and rules',
            })}
          >
            <EuiTextArea
              fullWidth
              rows={6}
              value={text}
              isInvalid={isInvalid}
              placeholder="api.github.com"
              onChange={(event) => setDraft(event.target.value)}
              data-test-subj="nightshiftSandboxAllowlistTextArea"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            {draft !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="text"
                  onClick={() => setDraft(undefined)}
                  isDisabled={isSaving}
                  data-test-subj="nightshiftSandboxAllowlistCancel"
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.CANCEL_SANDBOX_ALLOWLIST,
                    element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                  })}
                >
                  {i18n.translate('xpack.nightshift.settings.sandboxAllowlistCancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                onClick={save}
                isLoading={isSaving}
                isDisabled={!isDirty || isInvalid}
                data-test-subj="nightshiftSandboxAllowlistSave"
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.SAVE_SANDBOX_ALLOWLIST,
                  element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                })}
              >
                {i18n.translate('xpack.nightshift.settings.sandboxAllowlistSave', {
                  defaultMessage: 'Save allowlist',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </SettingsSectionRow>
  );
};
