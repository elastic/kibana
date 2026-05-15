/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { AwsService } from './ingest_hub/aws_services_data';

/** Must match Streams `StreamListView` so All streams shows the AWS demo table after onboarding. */
const INGEST_HUB_DATA_ADDED_SESSION_KEY = 'ingestHub:dataAdded';

/** Prototype delay before the callout transitions to success (replace with real readiness checks). */
const AWS_VERSION1_SEE_DATA_SUCCESS_DELAY_MS = 1800;

const PULSE_DOT_COUNT = 7;

export interface AwsVersion1SeeDataStreamsCalloutProps {
  readonly selectedServices: readonly AwsService[];
}

interface ConnectingAnimationProps {
  readonly sourceLabels: readonly string[];
  readonly destinationLabels: readonly string[];
}

const ConnectingAnimation = ({ sourceLabels, destinationLabels }: ConnectingAnimationProps) => {
  const [pulseIndex, setPulseIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPulseIndex((n) => (n + 1) % PULSE_DOT_COUNT);
    }, 380);
    return () => window.clearInterval(id);
  }, []);

  return (
    <EuiFlexGroup alignItems="stretch" justifyContent="center" gutterSize="m" responsive wrap>
      <EuiFlexItem grow={false} style={{ minWidth: 160, maxWidth: 220 }}>
        <EuiText size="xs" color="subdued" style={{ textTransform: 'uppercase', marginBottom: 8 }}>
          {i18n.translate(
            'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.sourcesHeading',
            {
              defaultMessage: 'Sources',
            }
          )}
        </EuiText>
        <EuiFlexGroup direction="column" gutterSize="s">
          {sourceLabels.map((label, i) => (
            <EuiPanel
              key={`${label}-${i}`}
              paddingSize="s"
              hasBorder
              style={{
                opacity: 0.45 + ((pulseIndex + i) % 3) * 0.2,
                transition: 'opacity 0.35s ease',
              }}
            >
              <EuiText size="xs">
                <strong>{label}</strong>
              </EuiText>
            </EuiPanel>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          justifyContent="center"
          gutterSize="xs"
          style={{ minHeight: 120, paddingTop: 20 }}
        >
          {Array.from({ length: PULSE_DOT_COUNT }, (_, i) => (
            <EuiIcon
              key={i}
              type="dot"
              size="s"
              color={i === pulseIndex ? 'primary' : 'subdued'}
              style={{
                opacity: i === pulseIndex ? 1 : 0.35,
                transition: 'opacity 0.2s ease',
              }}
              aria-hidden
            />
          ))}
          <EuiSpacer size="xs" />
          <EuiIcon type="arrowDown" color="subdued" aria-hidden />
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ minWidth: 160, maxWidth: 260 }}>
        <EuiText size="xs" color="subdued" style={{ textTransform: 'uppercase', marginBottom: 8 }}>
          {i18n.translate(
            'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.destinationsHeading',
            {
              defaultMessage: 'Destinations',
            }
          )}
        </EuiText>
        <EuiFlexGroup direction="column" gutterSize="s">
          {destinationLabels.map((label, i) => (
            <EuiPanel
              key={`${label}-${i}`}
              paddingSize="s"
              hasBorder
              style={{
                opacity: 0.45 + ((pulseIndex + i + 2) % 3) * 0.2,
                transition: 'opacity 0.35s ease',
              }}
            >
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.streamTag',
                  {
                    defaultMessage: 'Stream',
                  }
                )}
              </EuiText>
              <EuiText size="xs">
                <strong>{label}</strong>
              </EuiText>
            </EuiPanel>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function AwsVersion1SeeDataStreamsCallout({
  selectedServices,
}: AwsVersion1SeeDataStreamsCalloutProps) {
  const { services } = useKibana<ObservabilityOnboardingAppServices>();
  const [phase, setPhase] = useState<'loading' | 'success'>('loading');

  const safeSelectedServices = useMemo(
    () => (Array.isArray(selectedServices) ? selectedServices : []),
    [selectedServices]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPhase('success');
    }, AWS_VERSION1_SEE_DATA_SUCCESS_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const connectingSourceLabels = useMemo(() => {
    if (safeSelectedServices.length > 0) {
      return safeSelectedServices.slice(0, 3).map((s) => s.name);
    }
    return [
      i18n.translate(
        'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.sampleSourceTrail',
        {
          defaultMessage: 'AWS CloudTrail',
        }
      ),
      i18n.translate(
        'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.sampleSourceVpc',
        {
          defaultMessage: 'Amazon VPC (flow logs)',
        }
      ),
      i18n.translate(
        'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.sampleSourceCw',
        {
          defaultMessage: 'Amazon CloudWatch Logs',
        }
      ),
    ];
  }, [safeSelectedServices]);

  const connectingDestinationLabels = useMemo(() => {
    if (safeSelectedServices.length > 0) {
      return safeSelectedServices.slice(0, 2).map((s) => `logs-aws.${s.id}-default`);
    }
    return ['logs-aws.cloudtrail-default', 'logs-aws.vpcflow-default'];
  }, [safeSelectedServices]);

  const handleSeeData = useCallback(() => {
    try {
      sessionStorage.setItem(INGEST_HUB_DATA_ADDED_SESSION_KEY, 'true');
    } catch {
      // sessionStorage may be unavailable in private / restricted contexts; Streams still opens.
    }
    void services.application.navigateToApp?.('streams', {
      path: '/?rangeFrom=now-15m&rangeTo=now',
    });
  }, [services.application]);

  if (phase === 'loading') {
    return (
      <div data-test-subj="awsOnboardingVersion1SeeDataStreamsCallout">
        <EuiCallOut
          data-test-subj="awsOnboardingVersion1SeeDataCalloutLoading"
          announceOnMount={false}
          color="primary"
          heading="h4"
          title={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                {i18n.translate(
                  'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.loadingTitle',
                  {
                    defaultMessage: 'Connecting your telemetry to Streams',
                  }
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiText size="s" color="subdued">
            <p style={{ margin: 0 }}>
              {i18n.translate(
                'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.loadingBody',
                {
                  defaultMessage:
                    'Your AWS sources are handshaking with Elastic. When the connection is ready, you can open All streams to inspect ingestion.',
                }
              )}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <ConnectingAnimation
            sourceLabels={connectingSourceLabels}
            destinationLabels={connectingDestinationLabels}
          />
        </EuiCallOut>
      </div>
    );
  }

  return (
    <div data-test-subj="awsOnboardingVersion1SeeDataStreamsCallout">
      <EuiCallOut
        data-test-subj="awsOnboardingVersion1SeeDataCalloutSuccess"
        announceOnMount
        color="success"
        heading="h4"
        iconType="check"
        title={i18n.translate(
          'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.successTitle',
          {
            defaultMessage: 'You are ready to view your streams',
          }
        )}
      >
        <EuiText size="s">
          <p style={{ margin: 0 }}>
            {i18n.translate(
              'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.successBody',
              {
                defaultMessage:
                  'Open Streams — All streams to see ingestion for your AWS integrations in the last 15 minutes.',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButton
          fill
          color="primary"
          iconType="visTable"
          onClick={handleSeeData}
          data-test-subj="awsOnboardingVersion1SeeDataNavigateButton"
        >
          {i18n.translate(
            'xpack.observabilityOnboarding.awsVersion1SeeDataStreamsCallout.seeDataCta',
            {
              defaultMessage: 'See data',
            }
          )}
        </EuiButton>
      </EuiCallOut>
    </div>
  );
}
