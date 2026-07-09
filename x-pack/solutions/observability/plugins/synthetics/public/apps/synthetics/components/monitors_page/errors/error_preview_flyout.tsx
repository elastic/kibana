/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiDescriptionList,
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiBadge,
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDateFormat } from '../../../../../hooks/use_date_format';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { getErrorDetailsUrl } from '../../monitor_details/monitor_errors/error_details_url';
import { JourneyStepScreenshotContainer } from '../../common/screenshot/journey_step_screenshot_container';
import type { ErrorGroupItem } from '../../../../../../common/runtime_types';

export const ErrorPreviewFlyout = ({
  error,
  onClose,
}: {
  error: ErrorGroupItem;
  onClose: () => void;
}) => {
  const formatter = useDateFormat();
  const { basePath } = useSyntheticsSettingsContext();
  const isBrowser = error.monitorType === 'browser';

  const errorDetailsUrl = getErrorDetailsUrl({
    basePath,
    configId: error.configId,
    stateId: error.stateId,
    locationId: error.locationId,
  });

  const monitorUrl = `${basePath}/app/synthetics/monitor/${error.configId}`;

  const descriptionItems = [
    {
      title: MONITOR_LABEL,
      description: <a href={monitorUrl}>{error.monitorName}</a>,
    },
    {
      title: TYPE_LABEL,
      description: <EuiBadge color="hollow">{error.monitorType}</EuiBadge>,
    },
    {
      title: LOCATION_LABEL,
      description: error.locationName || '--',
    },
    {
      title: TIMESTAMP_LABEL,
      description: formatter(error.timestamp),
    },
    {
      title: DURATION_LABEL,
      description: formatDuration(error.durationMs),
    },
  ];

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="s"
      aria-labelledby="errorPreviewTitle"
      data-test-subj="syntheticsErrorPreviewFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id="errorPreviewTitle">{error.monitorName}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">{ERROR_LABEL}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {formatter(error.timestamp)} &middot; {error.locationName}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiCallOut title={ERROR_MESSAGE_LABEL} color="danger" iconType="warning" size="s">
          <EuiFlexGroup alignItems="flexStart" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s" style={{ wordBreak: 'break-word' }}>
                {error.errorMessage}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={error.errorMessage}>
                {(copy) => (
                  <EuiToolTip content={COPY_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      data-test-subj="syntheticsErrorPreviewFlyoutButton"
                      iconType="copyClipboard"
                      onClick={copy}
                      aria-label={COPY_LABEL}
                      size="xs"
                    />
                  </EuiToolTip>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>

        <EuiSpacer size="m" />

        {isBrowser && error.checkGroup && (
          <>
            <EuiPanel hasBorder hasShadow={false} paddingSize="s">
              <EuiText size="xs">
                <strong>{SCREENSHOT_LABEL}</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <JourneyStepScreenshotContainer
                checkGroup={error.checkGroup}
                initialStepNumber={1}
                stepStatus="failed"
                allStepsLoaded={true}
                retryFetchOnRevisit={false}
                size={[260, 160]}
                timestamp={error.timestamp}
              />
            </EuiPanel>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiDescriptionList
          type="column"
          compressed
          listItems={descriptionItems}
          columnWidths={[1, 2]}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="syntheticsErrorPreviewFlyoutButton" onClick={onClose}>
              {CLOSE_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="syntheticsErrorPreviewFlyoutButton"
              fill
              href={errorDetailsUrl}
              iconType="popout"
              iconSide="right"
            >
              {VIEW_DETAILS_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

function formatDuration(ms: number): string {
  if (ms == null || isNaN(ms)) return '--';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

const ERROR_LABEL = i18n.translate('xpack.synthetics.errorPreview.error', {
  defaultMessage: 'Error',
});

const ERROR_MESSAGE_LABEL = i18n.translate('xpack.synthetics.errorPreview.errorMessage', {
  defaultMessage: 'Error message',
});

const MONITOR_LABEL = i18n.translate('xpack.synthetics.errorPreview.monitor', {
  defaultMessage: 'Monitor',
});

const TYPE_LABEL = i18n.translate('xpack.synthetics.errorPreview.type', {
  defaultMessage: 'Type',
});

const LOCATION_LABEL = i18n.translate('xpack.synthetics.errorPreview.location', {
  defaultMessage: 'Location',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.synthetics.errorPreview.timestamp', {
  defaultMessage: 'Timestamp',
});

const DURATION_LABEL = i18n.translate('xpack.synthetics.errorPreview.duration', {
  defaultMessage: 'Duration',
});

const SCREENSHOT_LABEL = i18n.translate('xpack.synthetics.errorPreview.screenshot', {
  defaultMessage: 'Screenshot',
});

const COPY_LABEL = i18n.translate('xpack.synthetics.errorPreview.copy', {
  defaultMessage: 'Copy error message',
});

const CLOSE_LABEL = i18n.translate('xpack.synthetics.errorPreview.close', {
  defaultMessage: 'Close',
});

const VIEW_DETAILS_LABEL = i18n.translate('xpack.synthetics.errorPreview.viewDetails', {
  defaultMessage: 'View full details',
});
