/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIllustration,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { monitorGraphCogs } from '@elastic/eui-illustrations';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';

const DISMISS_LABEL = i18n.translate('xpack.nightshift.detectionSetupBanner.dismissButtonLabel', {
  defaultMessage: 'Dismiss',
});

export const DetectionSetupBanner = ({
  detectionsHref,
  onConfigure,
  onDismiss,
}: {
  detectionsHref: string;
  onConfigure: () => void;
  onDismiss: () => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="nightshiftDetectionSetupBanner">
      <EuiFlexGroup alignItems="flexStart" gutterSize="l" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIllustration
            type={monitorGraphCogs}
            alt=""
            css={css`
              max-inline-size: ${euiTheme.base * 10}px;
            `}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h3>
                  {i18n.translate('xpack.nightshift.detectionSetupBanner.title', {
                    defaultMessage:
                      'Let Elastic Nightshift discover events that require your attention',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">
                <p>
                  {i18n.translate('xpack.nightshift.detectionSetupBanner.description', {
                    defaultMessage:
                      'Set up your telemetry data sources and Elastic Nightshift will analyze your data, alerts, and existing knowledge to find the events worth investigating, then prioritize them for you.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={css`
                align-self: flex-start;
              `}
            >
              <EuiButton
                data-test-subj="nightshiftDetectionSetupBannerConfigureButton"
                href={detectionsHref}
                iconType="chartGauge"
                onClick={onConfigure}
                size="s"
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.CONFIGURE_DETECTION,
                  element: NIGHTSHIFT_EBT_ELEMENTS.DETECTION_SETUP_BANNER,
                  detail: JSON.stringify({ entry: 'home_banner' }),
                })}
              >
                {i18n.translate('xpack.nightshift.detectionSetupBanner.configureButtonLabel', {
                  defaultMessage: 'Configure detection',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={DISMISS_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={DISMISS_LABEL}
              data-test-subj="nightshiftDetectionSetupBannerDismissButton"
              iconType="cross"
              onClick={onDismiss}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
