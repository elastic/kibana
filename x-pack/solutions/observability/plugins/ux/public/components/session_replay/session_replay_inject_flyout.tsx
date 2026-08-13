/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core/public';
import {
  buildSessionReplayInjectPreview,
  buildSessionReplayInjectSnippet,
  SESSION_REPLAY_VENDOR_BUNDLE_PATH,
} from '../../../common/session_replay_inject';
import { SERVICE_NAME_MAX_LENGTH } from '../../../common/session_replay_settings';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { fetchSessionReplaySettings } from '../../services/rest/session_replay_api';

interface Props {
  http: HttpStart;
  onClose: () => void;
}

export function SessionReplayInjectFlyout({ http, onClose }: Props) {
  const { notifications } = useKibanaServices();
  const [otlpEndpoint, setOtlpEndpoint] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [agentSource, setAgentSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const agentUrl = http.basePath.prepend(SESSION_REPLAY_VENDOR_BUNDLE_PATH);
        const [settings, agentRes] = await Promise.all([
          fetchSessionReplaySettings({ http }),
          fetch(agentUrl),
        ]);
        if (!agentRes.ok) {
          throw new Error(`Failed to load session replay agent (${agentRes.status})`);
        }
        const source = await agentRes.text();
        if (!source.includes('startBrowserSdk')) {
          throw new Error('Session replay agent bundle is invalid');
        }
        if (!cancelled) {
          setOtlpEndpoint(settings.otlpEndpoint);
          setAgentSource(source);
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

  const snippet = useMemo(
    () =>
      agentSource
        ? buildSessionReplayInjectSnippet({
            agentSource,
            otlpEndpoint,
            serviceName: serviceName.trim(),
          })
        : '',
    [agentSource, otlpEndpoint, serviceName]
  );

  const preview = useMemo(
    () =>
      buildSessionReplayInjectPreview({
        otlpEndpoint,
        serviceName: serviceName.trim(),
      }),
    [otlpEndpoint, serviceName]
  );

  const missingEndpoint = !loading && otlpEndpoint.trim().length === 0;
  const missingServiceName = serviceName.trim().length === 0;
  const canCopy = Boolean(snippet) && !missingEndpoint && !missingServiceName;

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

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="m"
      aria-labelledby="uxSessionReplayInjectFlyoutTitle"
      data-test-subj="uxSessionReplayInjectFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="uxSessionReplayInjectFlyoutTitle">
            {i18n.translate('xpack.ux.sessions.injectFlyoutTitle', {
              defaultMessage: 'Inject snippet',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.ux.sessions.injectFlyoutDescription', {
              defaultMessage:
                'Copy the snippet and paste it into the DevTools console on the tab you want to record. The agent is inlined so the page Content-Security-Policy cannot block a remote script. Telemetry still goes to the OTLP endpoint from Capture settings. It does not persist after reload.',
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
            <EuiSpacer size="s" />
            <EuiButton
              fill
              iconType="copyClipboard"
              onClick={onCopy}
              isLoading={copying}
              isDisabled={!canCopy}
              data-test-subj="uxSessionReplayInjectCopyButton"
            >
              {i18n.translate('xpack.ux.sessions.injectFlyoutCopyButtonLabel', {
                defaultMessage: 'Copy snippet',
              })}
            </EuiButton>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.ux.sessions.injectFlyoutPreviewHelp', {
                  defaultMessage:
                    'Preview of the config only. The copied snippet includes the full inlined agent.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock
              language="javascript"
              isCopyable={false}
              overflowHeight={280}
              data-test-subj="uxSessionReplayInjectSnippet"
            >
              {preview}
            </EuiCodeBlock>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

export function SessionReplayInjectButton({ onClick }: { onClick: () => void }) {
  return (
    <EuiButtonEmpty
      size="s"
      iconType="console"
      onClick={onClick}
      data-test-subj="uxSessionReplayInjectButton"
    >
      {i18n.translate('xpack.ux.sessions.injectSnippetButtonLabel', {
        defaultMessage: 'Inject snippet',
      })}
    </EuiButtonEmpty>
  );
}
