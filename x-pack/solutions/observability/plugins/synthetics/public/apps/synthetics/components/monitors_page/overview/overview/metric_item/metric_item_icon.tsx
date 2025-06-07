/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  EuiLoadingSpinner,
  EuiToolTip,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiSkeletonText,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';

import { MetricErrorIcon } from './metric_error_icon';
import { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';
import { isTestRunning, manualTestRunSelector } from '../../../../../state/manual_test_runs';
import { selectErrorPopoverState, toggleErrorPopoverOpen } from '../../../../../state';
import { useErrorDetailsLink } from '../../../../common/links/error_details_link';
import { useDateFormat } from '../../../../../../../hooks/use_date_format';
import { useLatestError } from './use_latest_error';

const Container = styled.div`
  display: inline-block;
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 1;
`;

export const MetricItemIcon = ({
  monitor,
  status,
  timestamp,
  configIdByLocation,
}: {
  monitor: OverviewStatusMetaData;
  status: string;
  configIdByLocation: string;
  timestamp?: string;
}) => {
  const locationId = monitor.locations[0].id;

  const testNowRun = useSelector(manualTestRunSelector(monitor.configId));
  const isPopoverOpen = useSelector(selectErrorPopoverState);
  const { latestPing } = useLatestError({
    monitor,
    configIdByLocation,
  });

  const dispatch = useDispatch();

  const inProgress = isTestRunning(testNowRun);

  const errorLink = useErrorDetailsLink({
    locationId,
    configId: monitor.configId,
    stateId: latestPing?.state?.id!,
  });

  const formatter = useDateFormat();
  const testTime = formatter(timestamp);

  if (inProgress) {
    return (
      <Container>
        <EuiToolTip position="top" content={TEST_IN_PROGRESS}>
          <EuiLoadingSpinner />
        </EuiToolTip>
      </Container>
    );
  }

  const closePopover = () => {
    dispatch(toggleErrorPopoverOpen(null));
  };

  if (status === 'down') {
    return (
      <Container>
        <EuiPopover
          button={<MetricErrorIcon configIdByLocation={configIdByLocation} />}
          isOpen={configIdByLocation === isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="upCenter"
          panelStyle={{
            outline: 'none',
          }}
        >
          <EuiPopoverTitle>
            <EuiFlexGroup>
              <EuiFlexItem grow>{testTime}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="syntheticsMetricItemIconButton"
                  iconType="cross"
                  onClick={closePopover}
                  aria-label={i18n.translate(
                    'xpack.synthetics.metricItemIcon.euiButtonIcon.closePopover',
                    {
                      defaultMessage: 'Close popover',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverTitle>
          <div style={{ width: '300px', overflowWrap: 'break-word' }}>
            {latestPing?.url?.full && (
              <>
                {i18n.translate('xpack.synthetics.metricItemIcon.div.urlLabel', {
                  defaultMessage: 'URL: ',
                })}
                <EuiLink
                  data-test-subj="syntheticsMetricItemIconLink"
                  href={latestPing.url.full}
                  target="_blank"
                >
                  {latestPing.url.full}
                </EuiLink>
                <EuiSpacer size="s" />
              </>
            )}
            <EuiCallOut
              title={
                latestPing?.error?.message ? (
                  latestPing?.error?.message
                ) : (
                  <EuiSkeletonText lines={2} />
                )
              }
              color="danger"
              iconType="warning"
            />
          </div>
          <EuiPopoverFooter>
            <EuiButton
              data-test-subj="syntheticsMetricItemIconButton"
              fullWidth
              size="s"
              href={errorLink}
            >
              {ERROR_DETAILS}
            </EuiButton>
          </EuiPopoverFooter>
        </EuiPopover>
      </Container>
    );
  } else {
    if (monitor.urls) {
      return (
        <Container>
          <EuiButtonIcon
            title={monitor.urls}
            color="text"
            data-test-subj="syntheticsMetricItemIconButton"
            href={monitor.urls}
            iconType="link"
            target="_blank"
            aria-label={i18n.translate('xpack.synthetics.metricItemIcon.euiButtonIcon.monitorUrl', {
              defaultMessage: 'Monitor url',
            })}
          />
        </Container>
      );
    }
    return null;
  }
};

const ERROR_DETAILS = i18n.translate('xpack.synthetics.errorDetails.label', {
  defaultMessage: 'Error details',
});

const TEST_IN_PROGRESS = i18n.translate('xpack.synthetics.inProgress.label', {
  defaultMessage: 'Manual test run is in progress.',
});
