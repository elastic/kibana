/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiSuperSelect,
  EuiSpacer,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import type { EventSource, ExternalEventInput } from '../../../common/types/events';

// Import icons
import datadogIcon from '../../assets/icons/datadog.svg';
import sentryIcon from '../../assets/icons/sentry.svg';

// Default mock payloads for each provider
const DEFAULT_PAYLOADS: Record<EventSource, ExternalEventInput> = {
  prometheus: {
    title: 'High CPU Usage',
    message:
      'CPU usage exceeded 90% on instance node-1:9090. Current value: 94.5%. Job: node-exporter.',
    severity: 'critical',
    source: 'prometheus',
    status: 'open',
    tags: ['cpu', 'infrastructure', 'node-exporter'],
    raw_payload: {
      alertname: 'HighCPUUsage',
      instance: 'node-1:9090',
      job: 'node-exporter',
      severity: 'critical',
      value: 94.5,
    },
  },
  datadog: {
    title: 'APM: High Error Rate',
    message:
      'Error rate for service payment-service exceeded threshold. Current: 5.2%, Threshold: 1%. Environment: production.',
    severity: 'critical',
    source: 'datadog',
    status: 'open',
    tags: ['apm', 'error-rate', 'payment-service', 'production'],
    links: [
      {
        label: 'View in Datadog',
        url: 'https://app.datadoghq.com/apm/services/payment-service',
      },
    ],
    raw_payload: {
      alert_type: 'apm',
      service: 'payment-service',
      env: 'production',
      metric: 'error_rate',
      value: 5.2,
      threshold: 1,
      monitor_id: 12345678,
    },
  },
  sentry: {
    title: 'Failed to fetch user profile',
    message:
      'NetworkError: Server responded with 504 Gateway Timeout. Culprit: fetchUserProfile at app.js:245.',
    severity: 'critical',
    source: 'sentry',
    status: 'open',
    tags: ['javascript', 'frontend', 'network-error', 'production'],
    links: [
      {
        label: 'View in Sentry',
        url: 'https://sentry.io/issues/4616132097/',
      },
    ],
    raw_payload: {
      id: '4616132097',
      project: 'frontend-app',
      logger: 'javascript',
      level: 'error',
      culprit: 'fetchUserProfile at app.js:245',
      event: {
        event_id: 'a892bf7d01c640b597831fb1710e3414',
        platform: 'javascript',
        environment: 'production',
      },
    },
  },
  pagerduty: {
    title: 'PagerDuty Alert',
    message: 'High severity incident triggered',
    severity: 'critical',
    source: 'pagerduty',
    status: 'open',
    tags: ['pagerduty', 'incident'],
    raw_payload: {
      incident_id: 'P123456',
      service: 'production-api',
    },
  },
  custom: {
    title: 'Custom Alert',
    message: 'This is a custom alert message',
    severity: 'medium',
    source: 'custom',
    status: 'open',
    tags: ['custom'],
    raw_payload: {},
  },
};

interface ProviderOption {
  value: EventSource;
  inputDisplay: React.ReactNode;
  dropdownDisplay: React.ReactNode;
}

const getProviderOptions = (): ProviderOption[] => [
  {
    value: 'prometheus',
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoPrometheus" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>Prometheus</EuiFlexItem>
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoPrometheus" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <strong>Prometheus</strong>
          <EuiText size="xs" color="subdued">
            Infrastructure & Kubernetes monitoring
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'datadog',
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={datadogIcon} size="m" />
        </EuiFlexItem>
        <EuiFlexItem>Datadog</EuiFlexItem>
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={datadogIcon} size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <strong>Datadog</strong>
          <EuiText size="xs" color="subdued">
            APM, Infrastructure & Log monitoring
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'sentry',
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={sentryIcon} size="m" />
        </EuiFlexItem>
        <EuiFlexItem>Sentry</EuiFlexItem>
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={sentryIcon} size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <strong>Sentry</strong>
          <EuiText size="xs" color="subdued">
            Application error tracking
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

export interface GenerateMockEventModalProps {
  onClose: () => void;
  onSubmit: (payload: ExternalEventInput) => Promise<void>;
  isSubmitting: boolean;
}

export function GenerateMockEventModal({
  onClose,
  onSubmit,
  isSubmitting,
}: GenerateMockEventModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<EventSource>('datadog');
  const [payloadJson, setPayloadJson] = useState<string>(
    JSON.stringify(DEFAULT_PAYLOADS.datadog, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);

  const providerOptions = useMemo(() => getProviderOptions(), []);

  const handleProviderChange = useCallback((value: EventSource) => {
    setSelectedProvider(value);
    setPayloadJson(JSON.stringify(DEFAULT_PAYLOADS[value], null, 2));
    setParseError(null);
  }, []);

  const handlePayloadChange = useCallback((value: string) => {
    setPayloadJson(value);
    // Try to parse to validate JSON
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (e) {
      setParseError(
        i18n.translate('xpack.observability.generateMockEvent.invalidJson', {
          defaultMessage: 'Invalid JSON format',
        })
      );
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const payload = JSON.parse(payloadJson) as ExternalEventInput;
      // Ensure the source matches the selected provider
      payload.source = selectedProvider;
      await onSubmit(payload);
    } catch (e) {
      setParseError(
        i18n.translate('xpack.observability.generateMockEvent.invalidJson', {
          defaultMessage: 'Invalid JSON format',
        })
      );
    }
  }, [payloadJson, selectedProvider, onSubmit]);

  return (
    <EuiModal onClose={onClose} style={{ width: 700 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.observability.generateMockEvent.title', {
            defaultMessage: 'Generate Mock Event',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.observability.generateMockEvent.providerLabel', {
            defaultMessage: 'Alert Source',
          })}
          fullWidth
        >
          <EuiSuperSelect
            options={providerOptions}
            valueOfSelected={selectedProvider}
            onChange={handleProviderChange}
            fullWidth
            hasDividers
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.observability.generateMockEvent.payloadLabel', {
            defaultMessage: 'Alert Payload',
          })}
          helpText={i18n.translate('xpack.observability.generateMockEvent.payloadHelp', {
            defaultMessage: 'Customize the alert payload JSON before generating',
          })}
          isInvalid={!!parseError}
          error={parseError}
          fullWidth
        >
          <div style={{ border: '1px solid #D3DAE6', borderRadius: '4px' }}>
            <CodeEditor
              languageId="json"
              height="350px"
              value={payloadJson}
              onChange={handlePayloadChange}
              options={{
                fontSize: 12,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                lineNumbers: 'on',
                tabSize: 2,
              }}
            />
          </div>
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} disabled={isSubmitting}>
          {i18n.translate('xpack.observability.generateMockEvent.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleSubmit}
          fill
          isLoading={isSubmitting}
          disabled={!!parseError || isSubmitting}
        >
          {i18n.translate('xpack.observability.generateMockEvent.generate', {
            defaultMessage: 'Generate Event',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

