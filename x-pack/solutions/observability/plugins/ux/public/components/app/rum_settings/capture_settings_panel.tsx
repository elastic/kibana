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
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DEFAULT_SESSION_REPLAY_SETTINGS,
  IGNORE_URLS_MAX_LENGTH,
  MASK_TEXT_SELECTOR_MAX_LENGTH,
  OTLP_ENDPOINT_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  URL_GROUPING_DEPTH_MAX,
  URL_GROUPING_DEPTH_MIN,
  URL_GROUPING_RULES_MAX_LENGTH,
  SYNC_DELAY_MAX_LENGTH,
  SESSION_MAX_MS_MAX,
  SESSION_MAX_MS_MIN,
  SESSION_IDLE_MS_MAX,
  SESSION_IDLE_MS_MIN,
  msToMinutes,
  minutesToMs,
  normalizeSessionReplaySettings,
  type SessionReplaySettings,
} from '../../../../common/session_replay_settings';
import {
  isValidEsTimeValue,
  isValidLookbackDays,
  RUM_SESSIONS_LOOKBACK_DAYS_MAX,
  RUM_SESSIONS_LOOKBACK_DAYS_MIN,
  RUM_SESSIONS_SYNC_DELAY,
  rumAnalyticsHealth,
  type RumAnalyticsStatus,
} from '../../../../common/rum_sessions';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import {
  fetchSessionReplaySettings,
  updateSessionReplaySettings,
} from '../../../services/rest/session_replay_api';
import {
  fetchRumAnalyticsStatus,
  installRumSessionsTransform,
} from '../../../services/rest/rum_analytics_api';

export function CaptureSettingsPanel() {
  const { http, notifications } = useKibanaServices();
  const [settings, setSettings] = useState<SessionReplaySettings>(DEFAULT_SESSION_REPLAY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<RumAnalyticsStatus | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [result, status] = await Promise.all([
          fetchSessionReplaySettings({ http }),
          fetchRumAnalyticsStatus({ http }).catch(() => null),
        ]);
        if (!cancelled) {
          setSettings(result);
          setAnalytics(status);
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
      const nextAnalytics = await fetchRumAnalyticsStatus({ http }).catch(() => analytics);
      if (nextAnalytics) {
        setAnalytics(nextAnalytics);
      }
      notifications.toasts.addSuccess(
        nextAnalytics && rumAnalyticsHealth(nextAnalytics) !== 'missing'
          ? i18n.translate('xpack.ux.sessionReplaySettings.savedWithTransforms', {
              defaultMessage:
                'Settings saved. Session analytics now use a {syncDelay} delay and {lookbackDays} days of history. Reload Kibana pages to apply capture changes.',
              values: { syncDelay: saved.syncDelay, lookbackDays: saved.sourceLookbackDays },
            })
          : i18n.translate('xpack.ux.sessionReplaySettings.saved', {
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
  }, [analytics, http, notifications, settings]);

  const onInstallAnalytics = useCallback(async () => {
    setInstalling(true);
    try {
      const saved = await updateSessionReplaySettings({
        http,
        settings: normalizeSessionReplaySettings(settings),
      });
      setSettings(saved);
      const next = await installRumSessionsTransform({ http });
      setAnalytics(next);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.sessionReplaySettings.analyticsInstalled', {
          defaultMessage:
            'Session analytics transform installed. First results appear after a {syncDelay} delay.',
          values: { syncDelay: next.syncDelay },
        })
      );
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.sessionReplaySettings.analyticsInstallError', {
          defaultMessage: 'Could not install session analytics',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setInstalling(false);
    }
  }, [http, notifications, settings]);

  const endpointInvalid = settings.enabled && settings.otlpEndpoint.trim().length === 0;
  const syncDelayInvalid = !isValidEsTimeValue(settings.syncDelay);
  const lookbackDaysInvalid = !isValidLookbackDays(settings.sourceLookbackDays);
  const analyticsInvalid = syncDelayInvalid || lookbackDaysInvalid;
  const analyticsHealth = analytics ? rumAnalyticsHealth(analytics) : 'missing';

  if (loading) {
    return (
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
    );
  }

  return (
    <>
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
        <EuiForm component="form">
          {loadError ? (
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
          ) : null}

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
              onChange={(e) => setSettings((s) => ({ ...s, sampleRate: Number(e.target.value) }))}
              data-test-subj="uxSessionReplaySampleRateField"
            />
          </EuiFormRow>

          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ux.sessionReplaySettings.capturePolicyTitle', {
                defaultMessage: 'Capture policy',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.ux.sessionReplaySettings.capturePolicyHelp', {
                defaultMessage:
                  'Applied to the inject snippet and to Kibana auto-capture. URL grouping is also applied when aggregating Pages and Journeys.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.ignoreUrlsLabel', {
              defaultMessage: 'Ignore URLs',
            })}
            helpText={i18n.translate('xpack.ux.sessionReplaySettings.ignoreUrlsHelp', {
              defaultMessage:
                'One substring or pattern per line. Matching fetch/XHR/document URLs are not captured.',
            })}
          >
            <EuiTextArea
              value={settings.ignoreUrls}
              maxLength={IGNORE_URLS_MAX_LENGTH}
              onChange={(e) => setSettings((s) => ({ ...s, ignoreUrls: e.target.value }))}
              data-test-subj="uxSessionReplayIgnoreUrlsField"
              rows={3}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.groupingDepthLabel', {
              defaultMessage: 'URL grouping depth',
            })}
            helpText={i18n.translate('xpack.ux.sessionReplaySettings.groupingDepthHelp', {
              defaultMessage:
                'Path segments after this depth collapse to /*. IDs are replaced with :id.',
            })}
          >
            <EuiFieldNumber
              value={settings.urlGroupingDepth}
              min={URL_GROUPING_DEPTH_MIN}
              max={URL_GROUPING_DEPTH_MAX}
              onChange={(e) =>
                setSettings((s) => ({ ...s, urlGroupingDepth: Number(e.target.value) }))
              }
              data-test-subj="uxSessionReplayGroupingDepthField"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.groupingRulesLabel', {
              defaultMessage: 'URL grouping rules',
            })}
            helpText={i18n.translate('xpack.ux.sessionReplaySettings.groupingRulesHelp', {
              defaultMessage: 'One glob per line, for example /user/*.',
            })}
          >
            <EuiTextArea
              value={settings.urlGroupingRules}
              maxLength={URL_GROUPING_RULES_MAX_LENGTH}
              onChange={(e) => setSettings((s) => ({ ...s, urlGroupingRules: e.target.value }))}
              data-test-subj="uxSessionReplayGroupingRulesField"
              rows={3}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.sessionMaxLabel', {
              defaultMessage: 'Session max duration (minutes)',
            })}
            helpText={i18n.translate('xpack.ux.sessionReplaySettings.sessionMaxHelp', {
              defaultMessage:
                'The browser SDK starts a new session id after this time. Default 240 minutes (4 hours); the SDK otherwise rotates at 14 minutes.',
            })}
          >
            <EuiFieldNumber
              value={msToMinutes(settings.sessionMaxMs)}
              min={msToMinutes(SESSION_MAX_MS_MIN)}
              max={msToMinutes(SESSION_MAX_MS_MAX)}
              onChange={(e) =>
                setSettings((s) => ({ ...s, sessionMaxMs: minutesToMs(Number(e.target.value)) }))
              }
              data-test-subj="uxSessionReplaySessionMaxField"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.sessionIdleLabel', {
              defaultMessage: 'Session idle timeout (minutes)',
            })}
            helpText={i18n.translate('xpack.ux.sessionReplaySettings.sessionIdleHelp', {
              defaultMessage: 'Start a new session after this much inactivity. Default 30 minutes.',
            })}
          >
            <EuiFieldNumber
              value={msToMinutes(settings.sessionIdleMs)}
              min={msToMinutes(SESSION_IDLE_MS_MIN)}
              max={msToMinutes(SESSION_IDLE_MS_MAX)}
              onChange={(e) =>
                setSettings((s) => ({ ...s, sessionIdleMs: minutesToMs(Number(e.target.value)) }))
              }
              data-test-subj="uxSessionReplaySessionIdleField"
            />
          </EuiFormRow>

          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ux.sessionReplaySettings.privacyTitle', {
                defaultMessage: 'Privacy',
              })}
            </h3>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.ux.sessionReplaySettings.privacyHelp', {
                defaultMessage:
                  'Applied to the inject snippet and Kibana auto-capture. Form inputs are masked by default. Page text is recorded unless you turn masking on.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.maskAllInputsLabel', {
              defaultMessage: 'Form inputs',
            })}
          >
            <EuiSwitch
              label={i18n.translate('xpack.ux.sessionReplaySettings.maskAllInputsSwitch', {
                defaultMessage: 'Mask all input and textarea values',
              })}
              checked={settings.maskAllInputs}
              onChange={(e) => setSettings((s) => ({ ...s, maskAllInputs: e.target.checked }))}
              data-test-subj="uxSessionReplayMaskAllInputsSwitch"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.maskAllTextLabel', {
              defaultMessage: 'Page text',
            })}
          >
            <EuiSwitch
              label={i18n.translate('xpack.ux.sessionReplaySettings.maskAllTextSwitch', {
                defaultMessage: 'Mask all text in the replay',
              })}
              checked={settings.maskAllText}
              onChange={(e) => setSettings((s) => ({ ...s, maskAllText: e.target.checked }))}
              data-test-subj="uxSessionReplayMaskAllTextSwitch"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.maskSelectorLabel', {
              defaultMessage: 'Additional mask text selector',
            })}
            helpText={i18n.translate('xpack.ux.sessionReplaySettings.maskSelectorHelp', {
              defaultMessage:
                'CSS selector whose text is masked. When page text masking is on, this narrows the default (*).',
            })}
          >
            <EuiFieldText
              fullWidth
              value={settings.maskTextSelector}
              maxLength={MASK_TEXT_SELECTOR_MAX_LENGTH}
              onChange={(e) => setSettings((s) => ({ ...s, maskTextSelector: e.target.value }))}
              data-test-subj="uxSessionReplayMaskSelectorField"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.recordCanvasLabel', {
              defaultMessage: 'Canvas',
            })}
            helpText={i18n.translate('xpack.ux.sessionReplaySettings.recordCanvasHelp', {
              defaultMessage:
                'Canvas frames can include charts, PII, and other pixels not covered by text masking.',
            })}
          >
            <EuiSwitch
              label={i18n.translate('xpack.ux.sessionReplaySettings.recordCanvasSwitch', {
                defaultMessage: 'Record canvas contents',
              })}
              checked={settings.recordCanvas}
              onChange={(e) => setSettings((s) => ({ ...s, recordCanvas: e.target.checked }))}
              data-test-subj="uxSessionReplayRecordCanvasSwitch"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ux.sessionReplaySettings.graphqlLabel', {
              defaultMessage: 'GraphQL operation names',
            })}
          >
            <EuiSwitch
              label={i18n.translate('xpack.ux.sessionReplaySettings.graphqlSwitch', {
                defaultMessage: 'Read operation names from fetch/XHR bodies and headers',
              })}
              checked={settings.captureGraphql}
              onChange={(e) => setSettings((s) => ({ ...s, captureGraphql: e.target.checked }))}
              data-test-subj="uxSessionReplayGraphqlSwitch"
            />
          </EuiFormRow>

          <EuiSpacer size="l" />
          <EuiButton
            fill
            onClick={onSave}
            isLoading={saving}
            isDisabled={endpointInvalid || analyticsInvalid}
            data-test-subj="uxSessionReplaySaveButton"
          >
            {i18n.translate('xpack.ux.sessionReplaySettings.save', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiForm>
      </EuiPanel>
      <EuiSpacer size="l" />
      <EuiPanel
        paddingSize="l"
        hasShadow={false}
        hasBorder
        css={{ maxWidth: 720 }}
        data-test-subj="uxSessionAnalyticsSettings"
      >
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.ux.sessionReplaySettings.analyticsTitle', {
              defaultMessage: 'Session analytics',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.ux.sessionReplaySettings.analyticsDescription', {
              defaultMessage:
                'Builds a cluster-wide session index and daily page/service rollups from RUM events so funnels, journeys, the session list, and long date ranges (90d, 1y) stay fast. Requires manage_transform. The first checkpoint waits {syncDelay} so sessions are mostly complete.',
              values: { syncDelay: analytics?.syncDelay ?? RUM_SESSIONS_SYNC_DELAY },
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('xpack.ux.sessionReplaySettings.syncDelayLabel', {
            defaultMessage: 'Transform sync delay',
          })}
          helpText={i18n.translate('xpack.ux.sessionReplaySettings.syncDelayHelp', {
            defaultMessage:
              'How long session and daily transforms wait before a checkpoint is settled (5m, 30s, or 1h). Save applies this to running transforms immediately.',
          })}
          isInvalid={syncDelayInvalid}
          error={i18n.translate('xpack.ux.sessionReplaySettings.syncDelayError', {
            defaultMessage: 'Use a positive Elasticsearch time value such as 5m, 30s, or 1h.',
          })}
        >
          <EuiFieldText
            value={settings.syncDelay}
            maxLength={SYNC_DELAY_MAX_LENGTH}
            isInvalid={syncDelayInvalid}
            onChange={(e) => setSettings((s) => ({ ...s, syncDelay: e.target.value }))}
            data-test-subj="uxSessionReplaySyncDelayField"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ux.sessionReplaySettings.lookbackDaysLabel', {
            defaultMessage: 'Session history (days)',
          })}
          helpText={i18n.translate('xpack.ux.sessionReplaySettings.lookbackDaysHelp', {
            defaultMessage:
              'How far back the session index keeps history (1–400). Retention is three days longer. Increasing this rebuilds older sessions and can take a while.',
          })}
          isInvalid={lookbackDaysInvalid}
          error={i18n.translate('xpack.ux.sessionReplaySettings.lookbackDaysError', {
            defaultMessage: 'Use a whole number of days between {min} and {max}.',
            values: {
              min: RUM_SESSIONS_LOOKBACK_DAYS_MIN,
              max: RUM_SESSIONS_LOOKBACK_DAYS_MAX,
            },
          })}
        >
          <EuiFieldNumber
            value={settings.sourceLookbackDays}
            min={RUM_SESSIONS_LOOKBACK_DAYS_MIN}
            max={RUM_SESSIONS_LOOKBACK_DAYS_MAX}
            isInvalid={lookbackDaysInvalid}
            onChange={(e) =>
              setSettings((s) => ({ ...s, sourceLookbackDays: Number(e.target.value) }))
            }
            data-test-subj="uxSessionReplayLookbackDaysField"
          />
        </EuiFormRow>
        {analyticsHealth !== 'missing' ? (
          <>
            <EuiSpacer size="s" />
            <EuiButton
              size="s"
              onClick={() => void onInstallAnalytics()}
              isLoading={installing}
              isDisabled={analyticsInvalid}
              data-test-subj="uxSessionAnalyticsApplyButton"
            >
              {i18n.translate('xpack.ux.sessionReplaySettings.applyTransforms', {
                defaultMessage: 'Apply to transforms',
              })}
            </EuiButton>
          </>
        ) : null}
        <EuiSpacer size="m" />
        {analyticsHealth === 'missing' ? (
          <EuiButton
            fill
            isLoading={installing}
            isDisabled={analyticsInvalid}
            onClick={() => void onInstallAnalytics()}
            data-test-subj="uxSessionAnalyticsInstallButton"
          >
            {i18n.translate('xpack.ux.sessionReplaySettings.analyticsEnable', {
              defaultMessage: 'Enable session analytics',
            })}
          </EuiButton>
        ) : (
          <EuiCallOut
            announceOnMount
            color={analyticsHealth === 'healthy' ? 'success' : 'warning'}
            size="s"
            title={
              analyticsHealth === 'healthy'
                ? i18n.translate('xpack.ux.sessionReplaySettings.analyticsHealthy', {
                    defaultMessage: 'Session index is running ({transformId})',
                    values: { transformId: analytics?.transformId ?? '' },
                  })
                : i18n.translate('xpack.ux.sessionReplaySettings.analyticsRecovering', {
                    defaultMessage: 'Session index needs attention ({state})',
                    values: { state: analytics?.state ?? 'unknown' },
                  })
            }
          />
        )}
      </EuiPanel>
    </>
  );
}
