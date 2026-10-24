/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DEFAULT_BRANCH_MAX_LENGTH,
  emptyRumAppSettings,
  ISSUE_LABELS_MAX_LENGTH,
  isHttpRepositoryUrl,
  normalizeRumAppSettings,
  rumAppSettingsBody,
  REPOSITORY_URL_MAX_LENGTH,
  SOURCE_ROOT_MAX_LENGTH,
  type RumAppSettings,
} from '../../../../common/rum_app_settings';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumAppSettings, updateRumAppSettings } from '../../../services/rest/rum_api';
import { WebApplicationSelect } from '../rum_dashboard/panels/web_application_select';

export function RepositorySettingsPanel({ serviceName }: { serviceName?: string }) {
  const { http, notifications } = useKibanaServices();
  const [settings, setSettings] = useState<RumAppSettings>(emptyRumAppSettings(serviceName ?? ''));
  const [loading, setLoading] = useState(Boolean(serviceName));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceName) {
      setSettings(emptyRumAppSettings(''));
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await fetchRumAppSettings({ http, serviceName });
        if (!cancelled) {
          setSettings(result);
        }
      } catch (err) {
        if (!cancelled) {
          setSettings(emptyRumAppSettings(serviceName));
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http, serviceName]);

  const onSave = useCallback(async () => {
    if (!serviceName) {
      return;
    }
    setSaving(true);
    try {
      const saved = await updateRumAppSettings({
        http,
        serviceName,
        settings: rumAppSettingsBody(normalizeRumAppSettings(serviceName, settings)),
      });
      setSettings(saved);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.settings.repository.saved', {
          defaultMessage: 'Repository settings saved for {name}.',
          values: { name: serviceName },
        })
      );
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.settings.repository.saveError', {
          defaultMessage: 'Could not save repository settings',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }, [http, notifications, serviceName, settings]);

  const urlInvalid = !isHttpRepositoryUrl(settings.repositoryUrl);

  if (!serviceName) {
    return (
      <EuiCallOut
        announceOnMount
        color="primary"
        title={i18n.translate('xpack.ux.settings.repository.noAppTitle', {
          defaultMessage: 'Select an application',
        })}
      >
        <p>
          {i18n.translate('xpack.ux.settings.repository.noAppDescription', {
            defaultMessage: 'Repository info is per application. Choose one to continue.',
          })}
        </p>
        <EuiSpacer size="s" />
        <div css={{ maxWidth: 360 }}>
          <WebApplicationSelect />
        </div>
      </EuiCallOut>
    );
  }

  if (loading) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.ux.settings.repository.loading', {
              defaultMessage: 'Loading repository settings…',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPanel
      paddingSize="l"
      hasShadow={false}
      hasBorder
      css={{ maxWidth: 720 }}
      data-test-subj="uxAppRepositorySettings"
    >
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.ux.settings.repository.description', {
            defaultMessage:
              'Used to open mapped files and prefill GitHub issues from the evidence pack. Source maps stay in APM; this is only where to file.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiForm component="form">
        {loadError ? (
          <>
            <EuiCallOut
              announceOnMount
              color="warning"
              size="s"
              title={i18n.translate('xpack.ux.settings.repository.loadError', {
                defaultMessage: 'Could not load saved settings; showing defaults.',
              })}
            >
              <p>{loadError}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiFormRow
          label={i18n.translate('xpack.ux.settings.repository.urlLabel', {
            defaultMessage: 'Repository URL',
          })}
          helpText={i18n.translate('xpack.ux.settings.repository.urlHelp', {
            defaultMessage: 'HTTPS URL of the git remote, for example https://github.com/org/repo.',
          })}
          isInvalid={urlInvalid}
          error={i18n.translate('xpack.ux.settings.repository.urlError', {
            defaultMessage: 'Use an http or https URL.',
          })}
        >
          <EuiFieldText
            fullWidth
            placeholder="https://github.com/org/repo"
            value={settings.repositoryUrl}
            maxLength={REPOSITORY_URL_MAX_LENGTH}
            isInvalid={urlInvalid}
            onChange={(e) =>
              setSettings((current) => ({ ...current, repositoryUrl: e.target.value }))
            }
            data-test-subj="uxAppRepositoryUrlField"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ux.settings.repository.branchLabel', {
            defaultMessage: 'Default branch',
          })}
          helpText={i18n.translate('xpack.ux.settings.repository.branchHelp', {
            defaultMessage: 'Used when a session has no commit SHA.',
          })}
        >
          <EuiFieldText
            value={settings.defaultBranch}
            maxLength={DEFAULT_BRANCH_MAX_LENGTH}
            onChange={(e) =>
              setSettings((current) => ({ ...current, defaultBranch: e.target.value }))
            }
            data-test-subj="uxAppRepositoryBranchField"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ux.settings.repository.sourceRootLabel', {
            defaultMessage: 'Source root',
          })}
          helpText={i18n.translate('xpack.ux.settings.repository.sourceRootHelp', {
            defaultMessage: 'Monorepo prefix prepended to mapped paths, for example packages/shop.',
          })}
        >
          <EuiFieldText
            fullWidth
            placeholder="packages/shop"
            value={settings.sourceRoot}
            maxLength={SOURCE_ROOT_MAX_LENGTH}
            onChange={(e) => setSettings((current) => ({ ...current, sourceRoot: e.target.value }))}
            data-test-subj="uxAppRepositorySourceRootField"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ux.settings.repository.labelsLabel', {
            defaultMessage: 'Issue labels',
          })}
          helpText={i18n.translate('xpack.ux.settings.repository.labelsHelp', {
            defaultMessage: 'Comma-separated labels added to prefilled issues.',
          })}
        >
          <EuiFieldText
            fullWidth
            placeholder="bug, rum"
            value={settings.issueLabels}
            maxLength={ISSUE_LABELS_MAX_LENGTH}
            onChange={(e) =>
              setSettings((current) => ({ ...current, issueLabels: e.target.value }))
            }
            data-test-subj="uxAppRepositoryLabelsField"
          />
        </EuiFormRow>
        <EuiSpacer />
        <EuiButton
          fill
          onClick={() => void onSave()}
          isLoading={saving}
          isDisabled={urlInvalid}
          data-test-subj="uxAppRepositorySaveButton"
        >
          {i18n.translate('xpack.ux.settings.repository.saveButtonLabel', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiForm>
    </EuiPanel>
  );
}
