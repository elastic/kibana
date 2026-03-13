/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useFetcher } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';

const OPENCODE_CALLBACK_URL = 'http://localhost:14642';

type CallbackDeliveryStatus = 'idle' | 'sending' | 'sent' | 'failed';

async function sendCredentials(payload: object): Promise<boolean> {
  try {
    const res = await fetch(OPENCODE_CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const OpencodePanel: React.FC = () => {
  useFlowBreadcrumb({
    text: i18n.translate('xpack.observability_onboarding.opencodePanel.breadcrumbs.opencode', {
      defaultMessage: 'OpenCode Local Setup',
    }),
  });
  const { onPageReady } = usePerformanceContext();

  const [callbackStatus, setCallbackStatus] = useState<CallbackDeliveryStatus>('idle');
  const deliveryAttempted = useRef(false);

  const {
    data: setupData,
    error,
    refetch,
  } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/opencode/setup');
    },
    [],
    { showToastOnError: false }
  );

  const buildPayload = useCallback(
    (data: NonNullable<typeof setupData>) => ({
      es_url: data.elasticsearchUrl,
      kibana_url: data.kibanaUrl,
      api_key: data.apiKeyEncoded,
      provider: data.provider,
    }),
    []
  );

  useEffect(() => {
    if (!setupData || deliveryAttempted.current) {
      return;
    }

    deliveryAttempted.current = true;
    setCallbackStatus('sending');

    sendCredentials(buildPayload(setupData)).then((ok) => {
      setCallbackStatus(ok ? 'sent' : 'failed');
    });
  }, [setupData, buildPayload]);

  useEffect(() => {
    if (setupData) {
      onPageReady({
        meta: {
          description:
            '[ttfmp_onboarding] Requests to setup the opencode flow succeeded and the UI has rendered',
        },
      });
    }
  }, [onPageReady, setupData]);

  const configJson = useMemo(() => {
    if (!setupData) {
      return '';
    }
    return JSON.stringify(buildPayload(setupData), null, 2);
  }, [setupData, buildPayload]);

  if (error) {
    return <EmptyPrompt onboardingFlowType="opencode" error={error} onRetryClick={refetch} />;
  }

  const showCopyFallback = callbackStatus === 'failed';

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiFlexGroup direction="column" gutterSize="none">
        {callbackStatus === 'sent' ? (
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.observability_onboarding.opencodePanel.callbackSuccess.title',
              { defaultMessage: 'Credentials sent to opencode' }
            )}
            color="success"
            iconType="check"
          >
            <p>
              {i18n.translate(
                'xpack.observability_onboarding.opencodePanel.callbackSuccess.description',
                {
                  defaultMessage:
                    'Your credentials have been delivered. You can return to your terminal.',
                }
              )}
            </p>
          </EuiCallOut>
        ) : (
          <>
            {callbackStatus === 'failed' && (
              <>
                <EuiCallOut
                  announceOnMount
                  title={i18n.translate(
                    'xpack.observability_onboarding.opencodePanel.callbackFailed.title',
                    {
                      defaultMessage: 'Could not deliver credentials automatically',
                    }
                  )}
                  color="warning"
                  iconType="warning"
                >
                  <p>
                    {i18n.translate(
                      'xpack.observability_onboarding.opencodePanel.callbackFailed.description',
                      {
                        defaultMessage:
                          'The opencode CLI may no longer be running. Copy the configuration below and paste it manually.',
                      }
                    )}
                  </p>
                </EuiCallOut>
                <EuiSpacer size="l" />
              </>
            )}

            <EuiText>
              <p>
                {i18n.translate('xpack.observability_onboarding.opencodePanel.description', {
                  defaultMessage:
                    'Copy the configuration below to connect your local Elastic OpenCode distribution. It contains the Elasticsearch URL, Kibana URL, and a pre-configured API key with full permissions.',
                })}
              </p>
            </EuiText>

            <EuiSpacer size="l" />

            {(!setupData || callbackStatus === 'sending') && <EuiSkeletonText lines={6} />}

            {setupData && showCopyFallback && (
              <>
                <EuiCodeBlock language="json" isCopyable paddingSize="m" fontSize="m">
                  {configJson}
                </EuiCodeBlock>
                <EuiSpacer size="m" />
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup>
                    <EuiCopy textToCopy={configJson}>
                      {(copy) => (
                        <EuiButton
                          data-test-subj="observabilityOnboardingOpencodePanelCopyButton"
                          iconType="copyClipboard"
                          onClick={copy}
                        >
                          {i18n.translate(
                            'xpack.observability_onboarding.opencodePanel.copyToClipboard',
                            { defaultMessage: 'Copy to clipboard' }
                          )}
                        </EuiButton>
                      )}
                    </EuiCopy>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </>
            )}
          </>
        )}

        <EuiSpacer size="xl" />
        <FeedbackButtons flow="opencode" />
      </EuiFlexGroup>
    </EuiPanel>
  );
};
