/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RumBackendCall } from '../../../common/rum_backend';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import type { TraceFlyoutTarget } from './trace_waterfall_flyout';

const formatMs = (ms: number | null): string => {
  if (ms == null) {
    return '—';
  }
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

export const BackendCallsPanel = ({
  calls,
  rangeFrom,
  rangeTo,
  onViewTrace,
}: {
  calls: RumBackendCall[];
  rangeFrom: string;
  rangeTo: string;
  onViewTrace?: (target: TraceFlyoutTarget) => void;
}) => {
  const { observabilityShared } = useKibanaServices();

  if (calls.length === 0) {
    return (
      <>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.ux.backendCalls.title', { defaultMessage: 'Backend calls' })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.ux.backendCalls.empty', {
            defaultMessage: 'No client HTTP spans for this page yet.',
          })}
        </EuiText>
      </>
    );
  }

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.ux.backendCalls.title', { defaultMessage: 'Backend calls' })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {calls.map((call) => {
        const serviceHref =
          call.serviceName &&
          observabilityShared.locators.apm.serviceOverview.getRedirectUrl({
            serviceName: call.serviceName,
            rangeFrom,
            rangeTo,
          });
        return (
          <div key={call.origin} css={{ marginBottom: 8 }}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow>
                <EuiText size="s">
                  <strong>{call.origin}</strong>
                </EuiText>
              </EuiFlexItem>
              {call.failCount > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="danger">
                    {i18n.translate('xpack.ux.backendCalls.failBadge', {
                      defaultMessage: '{count} failed',
                      values: { count: call.failCount },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.ux.backendCalls.meta', {
                defaultMessage: '{count} calls · {duration}',
                values: { count: call.count, duration: formatMs(call.avgDurationMs) },
              })}
              {serviceHref && call.serviceName ? (
                <>
                  {' · '}
                  <EuiLink
                    data-test-subj="uxBackendCallServiceLink"
                    href={serviceHref}
                    target="_blank"
                  >
                    {call.serviceName}
                  </EuiLink>
                </>
              ) : null}
              {call.sampleTraceId && onViewTrace ? (
                <>
                  {' · '}
                  <EuiLink
                    data-test-subj="uxBackendCallTraceLink"
                    onClick={() =>
                      onViewTrace({
                        traceId: call.sampleTraceId as string,
                        title: call.origin,
                      })
                    }
                  >
                    {i18n.translate('xpack.ux.backendCalls.viewTrace', {
                      defaultMessage: 'View trace',
                    })}
                  </EuiLink>
                </>
              ) : null}
            </EuiText>
          </div>
        );
      })}
    </>
  );
};
