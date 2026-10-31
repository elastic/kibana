/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  buildSessionReplayInjectPreview,
  buildSessionReplayInjectSnippet,
  buildSessionReplaySdkHtmlSnippet,
  sessionReplaySdkScriptUrl,
  SESSION_REPLAY_SDK_SCRIPT_FILE,
  SESSION_REPLAY_VENDOR_BUNDLE_PATH,
} from '../../../../common/session_replay_inject';
import {
  DEFAULT_SESSION_REPLAY_SETTINGS,
  SERVICE_NAME_MAX_LENGTH,
  sdkCaptureFromSettings,
  type SessionReplaySettings,
} from '../../../../common/session_replay_settings';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchSessionReplaySettings } from '../../../services/rest/session_replay_api';

export function InjectSnippetPanel({ defaultServiceName }: { defaultServiceName?: string }) {
  const { http, notifications } = useKibanaServices();
  const [otlpEndpoint, setOtlpEndpoint] = useState('');
  const [serviceName, setServiceName] = useState(defaultServiceName ?? '');
  const [settings, setSettings] = useState<SessionReplaySettings>(DEFAULT_SESSION_REPLAY_SETTINGS);
  const [agentSource, setAgentSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyingHtml, setCopyingHtml] = useState(false);

  useEffect(() => {
    if (defaultServiceName) {
      setServiceName(defaultServiceName);
    }
  }, [defaultServiceName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const saved = await fetchSessionReplaySettings({ http });
        if (!cancelled) {
          setOtlpEndpoint(saved.otlpEndpoint);
          setSettings(saved);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAgentLoading(true);
      setAgentError(null);
      try {
        const agentUrl = http.basePath.prepend(SESSION_REPLAY_VENDOR_BUNDLE_PATH);
        const agentRes = await fetch(agentUrl);
        if (!agentRes.ok) {
          throw new Error(`Failed to load session replay agent (${agentRes.status})`);
        }
        const source = await agentRes.text();
        if (!source.includes('startBrowserSdk')) {
          throw new Error('Session replay agent bundle is invalid');
        }
        if (!cancelled) {
          setAgentSource(source);
        }
      } catch (err) {
        if (!cancelled) {
          setAgentError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setAgentLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http]);

  const capture = sdkCaptureFromSettings(settings);

  const snippetParams = useMemo(
    () => ({
      otlpEndpoint,
      serviceName: serviceName.trim(),
      ignoreUrls: capture.ignoreUrls,
      urlGroupingDepth: capture.urlGrouping.depth,
      urlGroupingRules: capture.urlGrouping.rules,
      maskTextSelector: settings.maskTextSelector,
      maskAllInputs: settings.maskAllInputs,
      maskAllText: settings.maskAllText,
      recordCanvas: settings.recordCanvas,
      sessionMaxMs: settings.sessionMaxMs,
      sessionIdleMs: settings.sessionIdleMs,
      captureGraphql: capture.graphql,
      sampleRate: settings.sampleRate,
    }),
    [otlpEndpoint, serviceName, capture, settings]
  );

  const snippet = useMemo(
    () => (agentSource ? buildSessionReplayInjectSnippet({ ...snippetParams, agentSource }) : ''),
    [agentSource, snippetParams]
  );
  const preview = useMemo(() => buildSessionReplayInjectPreview(snippetParams), [snippetParams]);
  const htmlSnippet = useMemo(
    () => buildSessionReplaySdkHtmlSnippet(snippetParams),
    [snippetParams]
  );
  const sdkScriptUrl = sessionReplaySdkScriptUrl(otlpEndpoint);

  const missingEndpoint = !loading && otlpEndpoint.trim().length === 0;
  const missingServiceName = serviceName.trim().length === 0;
  const canCopy = Boolean(snippet) && !missingEndpoint && !missingServiceName;
  const canCopyHtml = !missingEndpoint && !missingServiceName;

  const onCopy = async () => {
    if (!canCopy) {
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(snippet);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.sessions.injectFlyoutCopiedNotification', {
          defaultMessage: 'Snippet copied. Paste it into the DevTools console.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.sessions.injectFlyoutCopyFailedTitle', {
          defaultMessage: 'Could not copy snippet',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCopying(false);
    }
  };

  const onCopyHtml = async () => {
    if (!canCopyHtml) {
      return;
    }
    setCopyingHtml(true);
    try {
      await navigator.clipboard.writeText(htmlSnippet);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.sessions.injectSdkCopiedNotification', {
          defaultMessage: 'Page snippet copied. Paste it before the closing body tag.',
        })
      );
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.sessions.injectSdkCopyFailedTitle', {
          defaultMessage: 'Could not copy page snippet',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCopyingHtml(false);
    }
  };

  return (
    <EuiPanel paddingSize="m" data-test-subj="uxSessionReplayInjectPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.ux.sessions.injectFlyoutTitle', {
            defaultMessage: 'Inject snippet',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.ux.sessions.injectFlyoutDescription', {
            defaultMessage:
              'Load the SDK from the collector when the page can fetch that script. Use the inlined console snippet only when Content-Security-Policy blocks remote scripts. Telemetry still goes to the OTLP endpoint from Capture settings.',
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
              {i18n.translate('xpack.ux.sessions.injectFlyoutLoadingLabel', {
                defaultMessage: 'Loading capture settings…',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>
          {loadError && (
            <>
              <EuiCallOut
                announceOnMount
                color="warning"
                size="s"
                title={i18n.translate('xpack.ux.sessions.injectFlyoutLoadErrorTitle', {
                  defaultMessage: 'Could not load capture settings',
                })}
              >
                <p>{loadError}</p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}
          {missingEndpoint && (
            <>
              <EuiCallOut
                announceOnMount
                color="warning"
                size="s"
                title={i18n.translate('xpack.ux.sessions.injectFlyoutMissingEndpointTitle', {
                  defaultMessage: 'Set an OTLP endpoint in Capture settings first',
                })}
              />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiFormRow
            label={i18n.translate('xpack.ux.sessions.injectFlyoutServiceNameLabel', {
              defaultMessage: 'Service name',
            })}
            helpText={i18n.translate('xpack.ux.sessions.injectFlyoutServiceNameHelp', {
              defaultMessage:
                'Name of the app you are injecting into. Shown as service.name in the session list.',
            })}
          >
            <EuiFieldText
              fullWidth
              placeholder={i18n.translate('xpack.ux.sessions.injectFlyoutServiceNamePlaceholder', {
                defaultMessage: 'my-app',
              })}
              value={serviceName}
              maxLength={SERVICE_NAME_MAX_LENGTH}
              onChange={(e) => setServiceName(e.target.value)}
              data-test-subj="uxSessionReplayInjectServiceName"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ux.sessions.injectSdkTitle', {
                defaultMessage: 'Load the SDK from the collector',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.ux.sessions.injectSdkDescription"
                defaultMessage="You do not need the inlined console snippet. Point a script tag at {fileName} on the collector host from Capture settings, then call startBrowserSdk. Copy page snippet does both."
                values={{
                  fileName: <EuiCode>{SESSION_REPLAY_SDK_SCRIPT_FILE}</EuiCode>,
                }}
              />
            </p>
            <ol>
              <li>
                {i18n.translate('xpack.ux.sessions.injectSdkStepUrlDescription', {
                  defaultMessage:
                    'Copy the SDK script URL below, or copy the page snippet which already includes it.',
                })}
              </li>
              <li>
                {i18n.translate('xpack.ux.sessions.injectSdkStepPasteDescription', {
                  defaultMessage:
                    'Paste the page snippet before the closing body tag (or add the script tag and call startBrowserSdk from your own bundle).',
                })}
              </li>
              <li>
                {i18n.translate('xpack.ux.sessions.injectSdkStepCspDescription', {
                  defaultMessage:
                    'Allow this collector origin in Content-Security-Policy. If the page blocks remote scripts, use Console paste instead.',
                })}
              </li>
            </ol>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.ux.sessions.injectSdkScriptUrlLabel', {
              defaultMessage: 'SDK script URL',
            })}
            helpText={i18n.translate('xpack.ux.sessions.injectSdkScriptUrlHelp', {
              defaultMessage:
                'Same host as the OTLP endpoint. Use this as the src of a script tag.',
            })}
          >
            <EuiCodeBlock
              language="text"
              isCopyable={Boolean(sdkScriptUrl)}
              paddingSize="s"
              data-test-subj="uxSessionReplayInjectSdkUrl"
            >
              {sdkScriptUrl ||
                i18n.translate('xpack.ux.sessions.injectSdkScriptUrlMissingLabel', {
                  defaultMessage: 'Set an OTLP endpoint in Capture settings',
                })}
            </EuiCodeBlock>
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiButton
            fill
            iconType="copy"
            onClick={onCopyHtml}
            isLoading={copyingHtml}
            isDisabled={!canCopyHtml}
            data-test-subj="uxSessionReplayInjectCopyHtmlButton"
          >
            {i18n.translate('xpack.ux.sessions.injectSdkCopyButtonLabel', {
              defaultMessage: 'Copy page snippet',
            })}
          </EuiButton>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="html"
            isCopyable={canCopyHtml}
            overflowHeight={280}
            data-test-subj="uxSessionReplayInjectHtmlSnippet"
          >
            {htmlSnippet}
          </EuiCodeBlock>

          <EuiHorizontalRule />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ux.sessions.injectConsoleTitle', {
                defaultMessage: 'Console paste (CSP-safe)',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.ux.sessions.injectFlyoutPreviewHelp', {
                defaultMessage:
                  'Paste into DevTools on the tab you want to record. The copied snippet inlines the full agent (~270 KB) so script-src cannot block it. It does not persist after reload.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          {agentError && (
            <>
              <EuiCallOut
                announceOnMount
                color="warning"
                size="s"
                title={i18n.translate('xpack.ux.sessions.injectFlyoutAgentErrorTitle', {
                  defaultMessage: 'Could not load the inlined agent',
                })}
              >
                <p>{agentError}</p>
              </EuiCallOut>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiButton
            iconType="copy"
            onClick={onCopy}
            isLoading={copying || agentLoading}
            isDisabled={!canCopy}
            data-test-subj="uxSessionReplayInjectCopyButton"
          >
            {i18n.translate('xpack.ux.sessions.injectFlyoutCopyButtonLabel', {
              defaultMessage: 'Copy inlined snippet',
            })}
          </EuiButton>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="javascript"
            isCopyable={false}
            overflowHeight={220}
            data-test-subj="uxSessionReplayInjectSnippet"
          >
            {preview}
          </EuiCodeBlock>
        </>
      )}
    </EuiPanel>
  );
}
