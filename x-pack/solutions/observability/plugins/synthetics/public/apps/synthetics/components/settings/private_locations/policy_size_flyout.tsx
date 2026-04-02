/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiProgress,
  EuiCode,
  EuiSteps,
  useGeneratedHtmlId,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PrivateLocation } from '../../../../../../common/runtime_types';
import { usePolicySize } from './hooks/use_policy_size';

export const PolicySizeFlyout = ({
  location,
  onClose,
}: {
  location: PrivateLocation;
  onClose: () => void;
}) => {
  const { data, loading, error, fetchPolicySize } = usePolicySize();
  const flyoutTitleId = useGeneratedHtmlId();

  useEffect(() => {
    fetchPolicySize(location.id);
  }, [fetchPolicySize, location.id]);

  const severityColor = useMemo(() => {
    if (!data) return 'subdued';
    if (data.utilizationPercent > 100) return 'danger';
    if (data.utilizationPercent > 75) return 'warning';
    return 'success';
  }, [data]);

  const steps = [
    {
      title: STEP_1_TITLE,
      children: (
        <EuiText size="s">
          <p>{STEP_1_DESCRIPTION}</p>
          <EuiCode language="yaml">
            {`server:
  limits:
    checkin_limit:
      max_body_byte_size: 52428800`}
          </EuiCode>
        </EuiText>
      ),
    },
    {
      title: STEP_2_TITLE,
      children: (
        <EuiText size="s">
          <p>{STEP_2_DESCRIPTION}</p>
        </EuiText>
      ),
    },
    {
      title: STEP_3_TITLE,
      children: (
        <EuiText size="s">
          <p>{STEP_3_DESCRIPTION}</p>
        </EuiText>
      ),
    },
  ];

  return (
    <EuiFlyout onClose={onClose} css={{ width: 540 }} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{FLYOUT_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {location.label}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading && (
          <EuiFlexGroup justifyContent="center" alignItems="center" css={{ minHeight: 200 }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {error && (
          <EuiCallOut title={ERROR_TITLE} color="danger" iconType="error">
            <p>{error.message}</p>
          </EuiCallOut>
        )}

        {data && !loading && (
          <>
            <EuiPanel hasBorder>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiStat
                    title={data.policySizeFormatted}
                    description={POLICY_SIZE_LABEL}
                    titleSize="m"
                    titleColor={severityColor}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    title={data.inputCount}
                    description={INPUT_COUNT_LABEL}
                    titleSize="m"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="m" />

              <EuiText size="xs" color="subdued">
                {UTILIZATION_LABEL}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiProgress
                value={Math.min(data.utilizationPercent, 100)}
                max={100}
                color={severityColor}
                size="l"
                label={`${data.utilizationPercent}%`}
                valueText={`${data.policySizeFormatted} / ${data.defaultMaxCheckinFormatted}`}
              />
            </EuiPanel>

            <EuiSpacer size="l" />

            {data.exceedsDefault && (
              <>
                <EuiCallOut
                  title={EXCEEDS_LIMIT_TITLE}
                  color="danger"
                  iconType="warning"
                >
                  <p>{EXCEEDS_LIMIT_DESCRIPTION}</p>
                </EuiCallOut>
                <EuiSpacer size="l" />
              </>
            )}

            {data.utilizationPercent > 75 && !data.exceedsDefault && (
              <>
                <EuiCallOut
                  title={APPROACHING_LIMIT_TITLE}
                  color="warning"
                  iconType="warning"
                >
                  <p>{APPROACHING_LIMIT_DESCRIPTION}</p>
                </EuiCallOut>
                <EuiSpacer size="l" />
              </>
            )}

            <EuiHorizontalRule />

            <EuiTitle size="s">
              <h3>{HOW_TO_INCREASE_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <p>{HOW_TO_INCREASE_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="m" />

            <EuiSteps steps={steps} />
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const FLYOUT_TITLE = i18n.translate('xpack.synthetics.privateLocations.diagnostics.title', {
  defaultMessage: 'Private location diagnostics',
});

const POLICY_SIZE_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.policySize',
  { defaultMessage: 'Agent policy size' }
);

const INPUT_COUNT_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.inputCount',
  { defaultMessage: 'Total inputs' }
);

const UTILIZATION_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.utilization',
  { defaultMessage: 'Fleet Server check-in body size utilization (default 1 MB limit)' }
);

const EXCEEDS_LIMIT_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.exceedsLimit',
  { defaultMessage: 'Policy size exceeds Fleet Server default limit' }
);

const EXCEEDS_LIMIT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.exceedsLimitDesc',
  {
    defaultMessage:
      'The compiled agent policy exceeds the default Fleet Server check-in body size limit of 1 MB. Agents assigned to this policy may fail to check in with a "request body too large" error. Follow the steps below to increase the limit.',
  }
);

const APPROACHING_LIMIT_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.approachingLimit',
  { defaultMessage: 'Approaching Fleet Server default limit' }
);

const APPROACHING_LIMIT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.approachingLimitDesc',
  {
    defaultMessage:
      'The agent policy is approaching the default 1 MB check-in body size limit. Adding more monitors may cause check-in failures.',
  }
);

const ERROR_TITLE = i18n.translate('xpack.synthetics.privateLocations.diagnostics.error', {
  defaultMessage: 'Failed to load policy diagnostics',
});

const HOW_TO_INCREASE_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.howToIncrease',
  { defaultMessage: 'How to add more monitors' }
);

const HOW_TO_INCREASE_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.howToIncreaseDesc',
  {
    defaultMessage:
      'To support more monitors on this private location, increase the Fleet Server check-in body size limit by updating the Fleet Server agent policy.',
  }
);

const STEP_1_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.step1.title',
  { defaultMessage: 'Update Fleet Server policy limits' }
);

const STEP_1_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.step1.desc',
  {
    defaultMessage:
      'Navigate to Fleet > Agent policies and find the policy running your Fleet Server. Edit the Fleet Server integration and add the following under Advanced settings. Make sure this is configured on the policy that your Fleet Server is actually running on.',
  }
);

const STEP_2_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.step2.title',
  { defaultMessage: 'Verify Fleet Server picks up the change' }
);

const STEP_2_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.step2.desc',
  {
    defaultMessage:
      'After saving, the Fleet Server agent will receive the updated policy on its next check-in. Check Fleet Server logs for confirmation that the new limits are active. On Elastic Cloud, the change may require restarting the Integrations Server from the deployment settings.',
  }
);

const STEP_3_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.step3.title',
  { defaultMessage: 'Restart the private location agent' }
);

const STEP_3_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnostics.step3.desc',
  {
    defaultMessage:
      'If the agent is stuck in a "starting" state due to previous check-in failures, restart it to trigger an immediate check-in with the updated Fleet Server limits.',
  }
);
