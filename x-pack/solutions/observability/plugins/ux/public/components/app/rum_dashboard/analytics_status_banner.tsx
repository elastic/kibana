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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { rumAnalyticsHealth, type RumAnalyticsStatus } from '../../../../common/rum_sessions';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import {
  fetchRumAnalyticsStatus,
  installRumSessionsTransform,
} from '../../../services/rest/rum_analytics_api';
import { mergeRumSearch } from '../../../utils/rum_search';

const formatWatermark = (watermark: string | null): string => {
  if (!watermark) {
    return i18n.translate('xpack.ux.analytics.unknownWatermark', {
      defaultMessage: 'the last completed checkpoint',
    });
  }
  const parsed = Date.parse(watermark);
  if (!Number.isFinite(parsed)) {
    return watermark;
  }
  return new Date(parsed).toLocaleString();
};

export function AnalyticsStatusBanner() {
  const { http, notifications } = useKibanaServices();
  const history = useHistory();
  const {
    urlParams: { includeRaw, analyticsMode },
  } = useLegacyUrlParams();
  const [status, setStatus] = useState<RumAnalyticsStatus | null>(null);
  const [installing, setInstalling] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await fetchRumAnalyticsStatus({ http }));
    } catch {
      setStatus(null);
    }
  }, [http]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setFlags = (patch: { includeRaw?: string; analyticsMode?: string }) => {
    history.replace({
      ...history.location,
      search: mergeRumSearch(history.location.search, patch),
    });
  };

  const onInstall = async () => {
    setInstalling(true);
    try {
      const next = await installRumSessionsTransform({ http });
      setStatus(next);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.analytics.installSuccess', {
          defaultMessage:
            'Session analytics transform installed. First results appear after a {syncDelay} delay.',
          values: { syncDelay: next.syncDelay },
        })
      );
    } catch (err) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.ux.analytics.installError', {
          defaultMessage: 'Could not install session analytics',
        }),
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setInstalling(false);
    }
  };

  if (!status) {
    return null;
  }

  const health = rumAnalyticsHealth(status);
  const usingRaw = analyticsMode === 'raw' || health === 'missing';
  const includingRaw = includeRaw === 'true';

  if (health === 'missing') {
    return (
      <>
        <EuiCallOut
          announceOnMount
          color="warning"
          size="s"
          title={i18n.translate('xpack.ux.analytics.missingTitle', {
            defaultMessage: 'Session analytics is sampling raw events',
          })}
          data-test-subj="uxAnalyticsStatusMissing"
        >
          <p>
            {i18n.translate('xpack.ux.analytics.missingBody', {
              defaultMessage:
                'Funnels, journeys, and the session list currently scan a capped sample of raw events. Enable session analytics for complete sessions and fast 90-day / 1-year Overview and Pages.',
            })}
          </p>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={installing}
                onClick={() => void onInstall()}
                data-test-subj="uxAnalyticsInstallButton"
              >
                {i18n.translate('xpack.ux.analytics.enableButton', {
                  defaultMessage: 'Enable session analytics',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => history.push('/session-replay/settings')}
                data-test-subj="uxAnalyticsSettingsLink"
              >
                {i18n.translate('xpack.ux.analytics.settingsLink', {
                  defaultMessage: 'Settings',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  if (usingRaw) {
    return (
      <>
        <EuiCallOut
          announceOnMount
          color="primary"
          size="s"
          title={i18n.translate('xpack.ux.analytics.rawTitle', {
            defaultMessage: 'Using raw event sampling',
          })}
          data-test-subj="uxAnalyticsStatusRaw"
        >
          <p>
            {i18n.translate('xpack.ux.analytics.rawBody', {
              defaultMessage:
                'Queries are scanning raw events instead of the session index. Switch back for complete, cheap session totals.',
            })}
          </p>
          <EuiButtonEmpty
            size="s"
            onClick={() => setFlags({ analyticsMode: '' })}
            data-test-subj="uxAnalyticsUseIndexButton"
          >
            {i18n.translate('xpack.ux.analytics.useIndexButton', {
              defaultMessage: 'Use session index',
            })}
          </EuiButtonEmpty>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  if (health === 'recovering') {
    return (
      <>
        <EuiCallOut
          announceOnMount
          color="warning"
          size="s"
          title={
            status.watermark
              ? i18n.translate('xpack.ux.analytics.recoveringTitle', {
                  defaultMessage: 'Session index is catching up',
                })
              : i18n.translate('xpack.ux.analytics.warmingTitle', {
                  defaultMessage: 'Session index is warming up',
                })
          }
          data-test-subj="uxAnalyticsStatusRecovering"
        >
          <p>
            {status.watermark
              ? i18n.translate('xpack.ux.analytics.recoveringBody', {
                  defaultMessage:
                    'Showing settled sessions through {watermark}. Opt in to include the raw tail, or temporarily use raw event sampling.',
                  values: { watermark: formatWatermark(status.watermark) },
                })
              : i18n.translate('xpack.ux.analytics.warmingBody', {
                  defaultMessage:
                    'Using raw event sampling until the first {syncDelay} checkpoint completes.',
                  values: { syncDelay: status.syncDelay },
                })}
          </p>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => setFlags({ includeRaw: includingRaw ? '' : 'true' })}
                data-test-subj="uxAnalyticsIncludeRawButton"
              >
                {includingRaw
                  ? i18n.translate('xpack.ux.analytics.hideRawButton', {
                      defaultMessage: 'Hide last {syncDelay}',
                      values: { syncDelay: status.syncDelay },
                    })
                  : i18n.translate('xpack.ux.analytics.includeRawButton', {
                      defaultMessage: 'Include last {syncDelay}',
                      values: { syncDelay: status.syncDelay },
                    })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={() => setFlags({ analyticsMode: 'raw' })}
                data-test-subj="uxAnalyticsUseRawButton"
              >
                {i18n.translate('xpack.ux.analytics.useRawButton', {
                  defaultMessage: 'Use raw events',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  return (
    <>
      <EuiCallOut
        announceOnMount
        color="primary"
        size="s"
        title={
          includingRaw
            ? i18n.translate('xpack.ux.analytics.healthyRawTitle', {
                defaultMessage: 'Session index plus the last {syncDelay}',
                values: { syncDelay: status.syncDelay },
              })
            : i18n.translate('xpack.ux.analytics.healthyTitle', {
                defaultMessage: 'Session totals through {watermark}',
                values: { watermark: formatWatermark(status.watermark) },
              })
        }
        data-test-subj="uxAnalyticsStatusHealthy"
      >
        <EuiButtonEmpty
          size="s"
          onClick={() => setFlags({ includeRaw: includingRaw ? '' : 'true' })}
          data-test-subj="uxAnalyticsIncludeRawButton"
        >
          {includingRaw
            ? i18n.translate('xpack.ux.analytics.hideRawButton', {
                defaultMessage: 'Hide last {syncDelay}',
                values: { syncDelay: status.syncDelay },
              })
            : i18n.translate('xpack.ux.analytics.includeRawButton', {
                defaultMessage: 'Include last {syncDelay}',
                values: { syncDelay: status.syncDelay },
              })}
        </EuiButtonEmpty>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
