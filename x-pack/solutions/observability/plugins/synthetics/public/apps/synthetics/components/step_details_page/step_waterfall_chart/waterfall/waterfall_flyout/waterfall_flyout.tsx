/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE, useUiTracker } from '@kbn/observability-shared-plugin/public';
import { Table } from './waterfall_flyout_table';
import { MiddleTruncatedText } from '../middle_truncated_text';
import { WaterfallMetadataEntry } from '../../../common/network_data/types';
import { OnFlyoutClose } from './use_flyout';

export const DETAILS = i18n.translate('xpack.synthetics.synthetics.waterfall.flyout.details', {
  defaultMessage: 'Details',
});

export const CERTIFICATES = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.flyout.certificates',
  {
    defaultMessage: 'Certificate headers',
  }
);

export const REQUEST_HEADERS = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.flyout.requestHeaders',
  {
    defaultMessage: 'Request headers',
  }
);

export const RESPONSE_HEADERS = i18n.translate(
  'xpack.synthetics.synthetics.waterfall.flyout.responseHeaders',
  {
    defaultMessage: 'Response headers',
  }
);

const FlyoutContainer = euiStyled(EuiFlyout)`
  z-index: ${(props) => props.theme.eui.euiZLevel5};
`;

export interface WaterfallFlyoutProps {
  flyoutData?: WaterfallMetadataEntry;
  onFlyoutClose: OnFlyoutClose;
  isFlyoutVisible?: boolean;
}

export const WaterfallFlyout = ({
  flyoutData,
  isFlyoutVisible,
  onFlyoutClose,
}: WaterfallFlyoutProps) => {
  const flyoutRef = useRef<HTMLDivElement>(null);
  const trackMetric = useUiTracker({ app: 'uptime' });

  useEffect(() => {
    if (isFlyoutVisible && flyoutData && flyoutRef.current) {
      flyoutRef.current?.focus();
    }
  }, [flyoutData, isFlyoutVisible, flyoutRef]);

  if (!flyoutData || !isFlyoutVisible) {
    return null;
  }

  const { x, url, details, certificates, requestHeaders, responseHeaders } = flyoutData;

  trackMetric({ metric: 'waterfall_flyout', metricType: METRIC_TYPE.CLICK });

  return (
    <div
      tabIndex={-1}
      ref={flyoutRef}
      data-test-subj="waterfallFlyout"
      aria-labelledby="flyoutTitle"
    >
      <FlyoutContainer size="s" onClose={onFlyoutClose}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              <EuiFlexItem>
                <MiddleTruncatedText index={x + 1} url={url} ariaLabel={url} highestIndex={x + 1} />
              </EuiFlexItem>
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <Table rows={details} title={DETAILS} />
          {!!requestHeaders && (
            <>
              <EuiSpacer size="m" />
              <Table rows={requestHeaders} title={REQUEST_HEADERS} />
            </>
          )}
          {!!responseHeaders && (
            <>
              <EuiSpacer size="m" />
              <Table rows={responseHeaders} title={RESPONSE_HEADERS} />
            </>
          )}
          {!!certificates && (
            <>
              <EuiSpacer size="m" />
              <Table rows={certificates} title={CERTIFICATES} />
            </>
          )}
        </EuiFlyoutBody>
      </FlyoutContainer>
    </div>
  );
};
