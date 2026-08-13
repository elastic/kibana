/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import {
  DEFAULT_SESSION_REPLAY_SETTINGS,
  OTLP_ENDPOINT_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  normalizeSessionReplaySettings,
  type SessionReplaySettings,
} from '../../../common/session_replay_settings';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import {
  fetchSessionReplaySettings,
  updateSessionReplaySettings,
} from '../../services/rest/session_replay_api';

export function SessionReplaySettingsPage() {
  const { http, notifications, observabilityShared } = useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const history = useHistory();

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.ux.sessionReplay.breadcrumbs.root', {
        defaultMessage: 'User Experience',
      }),
      href: http.basePath.prepend('/app/ux'),
    },
    {
      text: i18n.translate('xpack.ux.breadcrumbs.sessionReplay', {
        defaultMessage: 'Session Replay',
      }),
      href: http.basePath.prepend('/app/ux/session-replay'),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        history.push('/session-replay');
      },
    },
    {
      text: i18n.translate('xpack.ux.breadcrumbs.sessionReplaySettings', {
        defaultMessage: 'Settings',
      }),
    },
  ]);

  const [settings, setSettings] = useState<SessionReplaySettings>(DEFAULT_SESSION_REPLAY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await fetchSessionReplaySettings({ http });
        if (!cancelled) {
          setSettings(result);
        }
      } catch (err) {
        if (!cancelled) {
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
  }, [http]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await updateSessionReplaySettings({
        http,
        settings: normalizeSessionReplaySettings(settings),
      });
      setSettings(saved);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.sessionReplaySettings.saved', {
          defaultMessage: 'Session replay settings saved. Reload Kibana pages to apply.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.sessionReplaySettings.saveError', {
          defaultMessage: 'Could not save session replay settings',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  }, [http, notifications, settings]);

  const endpointInvalid = settings.enabled && settings.otlpEndpoint.trim().length === 0;

  return (
    <div data-test-subj="uxSessionReplaySettingsPage">
      <PageTemplateComponent
        paddingSize="m"
        pageHeader={{
          pageTitle: i18n.translate('xpack.ux.sessionReplaySettings.title', {
            defaultMessage: 'Session replay capture',
          }),
        }}
      >
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder css={{ maxWidth: 720 }}>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.ux.sessionReplaySettings.description', {
                defaultMessage:
                  'When enabled, Kibana loads the EDOT browser SDK and records the sessions of everyone using this deployment, sending them to the OTLP endpoint below. Changes apply on the next page load — no rebuild or redeploy required.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          {loading ? (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate('xpack.ux.sessionReplaySettings.loading', {
                    defaultMessage: 'Loading settings…',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiForm component="form">
              {loadError && (
                <>
                  <EuiCallOut
                    announceOnMount
                    color="warning"
                    size="s"
                    title={i18n.translate('xpack.ux.sessionReplaySettings.loadError', {
                      defaultMessage: 'Could not load saved settings; showing defaults.',
                    })}
                  >
                    <p>{loadError}</p>
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}

              <EuiFormRow
                label={i18n.translate('xpack.ux.sessionReplaySettings.enabledLabel', {
                  defaultMessage: 'Record sessions',
                })}
              >
                <EuiSwitch
                  label={i18n.translate('xpack.ux.sessionReplaySettings.enabledSwitch', {
                    defaultMessage: 'Enable automatic session capture',
                  })}
                  checked={settings.enabled}
                  onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
                  data-test-subj="uxSessionReplayEnabledSwitch"
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.ux.sessionReplaySettings.endpointLabel', {
                  defaultMessage: 'OTLP endpoint',
                })}
                helpText={i18n.translate('xpack.ux.sessionReplaySettings.endpointHelp', {
                  defaultMessage:
                    'HTTPS URL of the EDOT collector OTLP/HTTP receiver (e.g. https://collector.example.com).',
                })}
                isInvalid={endpointInvalid}
                error={i18n.translate('xpack.ux.sessionReplaySettings.endpointRequired', {
                  defaultMessage: 'An OTLP endpoint is required when capture is enabled.',
                })}
              >
                <EuiFieldText
                  fullWidth
                  placeholder="https://collector.example.com"
                  value={settings.otlpEndpoint}
                  maxLength={OTLP_ENDPOINT_MAX_LENGTH}
                  isInvalid={endpointInvalid}
                  onChange={(e) => setSettings((s) => ({ ...s, otlpEndpoint: e.target.value }))}
                  data-test-subj="uxSessionReplayEndpointField"
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.ux.sessionReplaySettings.serviceNameLabel', {
                  defaultMessage: 'Service name',
                })}
                helpText={i18n.translate('xpack.ux.sessionReplaySettings.serviceNameHelp', {
                  defaultMessage: 'Identifies these sessions in the session list (service.name).',
                })}
              >
                <EuiFieldText
                  fullWidth
                  value={settings.serviceName}
                  maxLength={SERVICE_NAME_MAX_LENGTH}
                  onChange={(e) => setSettings((s) => ({ ...s, serviceName: e.target.value }))}
                  data-test-subj="uxSessionReplayServiceNameField"
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('xpack.ux.sessionReplaySettings.sampleRateLabel', {
                  defaultMessage: 'Sample rate (%)',
                })}
                helpText={i18n.translate('xpack.ux.sessionReplaySettings.sampleRateHelp', {
                  defaultMessage:
                    'Percentage of sessions to record for replay. Errors are always captured.',
                })}
              >
                <EuiFieldNumber
                  value={settings.sampleRate}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, sampleRate: Number(e.target.value) }))
                  }
                  data-test-subj="uxSessionReplaySampleRateField"
                />
              </EuiFormRow>

              <EuiSpacer size="l" />

              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={onSave}
                    isLoading={saving}
                    isDisabled={endpointInvalid}
                    data-test-subj="uxSessionReplaySaveButton"
                  >
                    {i18n.translate('xpack.ux.sessionReplaySettings.save', {
                      defaultMessage: 'Save',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => history.push({ pathname: '/session-replay' })}
                    data-test-subj="uxSessionReplaySettingsBackButton"
                  >
                    {i18n.translate('xpack.ux.sessionReplaySettings.back', {
                      defaultMessage: 'Back to sessions',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          )}
        </EuiPanel>
      </PageTemplateComponent>
    </div>
  );
}
