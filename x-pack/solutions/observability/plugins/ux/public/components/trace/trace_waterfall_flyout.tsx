/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { rangeAroundTimestamp, resolveTimeRange } from '../../../common/rum_backend';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { uxFlyoutProps, type UxFlyoutSession } from '../flyout/ux_flyout_props';

export interface TraceFlyoutTarget {
  traceId: string;
  spanId?: string | null;
  timestamp?: string | null;
  title?: string;
}

const UX_WATERFALL_EBT = {
  row: { element: 'ux.traceWaterfall.row' },
  errorBadge: { element: 'ux.traceWaterfall.errorBadge' },
  serviceBadge: { element: 'ux.traceWaterfall.serviceBadge' },
};

export const TraceWaterfallFlyout = ({
  target,
  rangeFrom,
  rangeTo,
  onClose,
  session = 'start',
}: {
  target: TraceFlyoutTarget;
  rangeFrom: string;
  rangeTo: string;
  onClose: () => void;
  session?: UxFlyoutSession;
}) => {
  const { apmShared, observabilityShared } = useKibanaServices();
  const [fullTrace, setFullTrace] = useState(true);
  const titleId = useGeneratedHtmlId({ prefix: 'uxTraceWaterfallTitle' });
  const range = useMemo(() => {
    const resolved = resolveTimeRange(rangeFrom, rangeTo);
    return rangeAroundTimestamp(
      target.timestamp ?? undefined,
      resolved.rangeFrom,
      resolved.rangeTo
    );
  }, [target.timestamp, rangeFrom, rangeTo]);

  const apmHref = observabilityShared.locators.apm.transactionDetailsByTraceId.getRedirectUrl({
    traceId: target.traceId,
    waterfallItemId: target.spanId ?? undefined,
    rangeFrom: range.rangeFrom,
    rangeTo: range.rangeTo,
  });

  const Focused = apmShared.FocusedTraceWaterfallWithFetching;
  const Full = apmShared.TraceWaterfallWithFetching;
  const title =
    target.title ??
    i18n.translate('xpack.ux.traceWaterfall.title', {
      defaultMessage: 'Backend trace',
    });

  return (
    <EuiFlyout
      {...uxFlyoutProps({ title, session })}
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="uxTraceWaterfallFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id={titleId}>{title}</h2>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              {target.traceId}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="uxTraceWaterfallToggle"
              size="s"
              onClick={() => setFullTrace((current) => !current)}
            >
              {fullTrace
                ? i18n.translate('xpack.ux.traceWaterfall.showFocused', {
                    defaultMessage: 'Show summary',
                  })
                : i18n.translate('xpack.ux.traceWaterfall.showFull', {
                    defaultMessage: 'Show full trace',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="uxTraceWaterfallOpenInApm"
              href={apmHref}
              target="_blank"
              size="s"
            >
              {i18n.translate('xpack.ux.traceWaterfall.openInApm', {
                defaultMessage: 'Open in APM',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div
          css={css`
            min-height: 420px;
            height: 70vh;
          `}
        >
          {fullTrace ? (
            <Full
              traceId={target.traceId}
              rangeFrom={range.rangeFrom}
              rangeTo={range.rangeTo}
              ebt={UX_WATERFALL_EBT}
            />
          ) : (
            <Focused traceId={target.traceId} rangeFrom={range.rangeFrom} rangeTo={range.rangeTo} />
          )}
        </div>
        <EuiSpacer size="s" />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
