/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { Feature } from '@kbn/significant-events-schema';
import {
  encodeFeatureAttachmentOrigin,
  KI_FEATURE_ATTACHMENT_TYPE,
} from '@kbn/significant-events-plugin/common';
import { EntityFlyout } from './entity_flyout';

const mockOpenChat = jest.fn();

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      agentBuilder: {
        openChat: mockOpenChat,
      },
    },
  }),
}));

const mockFeature: Feature = {
  uuid: 'feature-uuid-1',
  id: 'synthetics-task-manager',
  stream_name: 'logs.synthetics',
  type: 'entity',
  subtype: 'service',
  title: 'synthetics-task-manager',
  description:
    'Agentless API is a Go-based Kubernetes service in the agentless-api namespace serving liveness checks.',
  properties: {
    'service.name': 'agentless-api',
  },
  confidence: 82,
  evidence: [
    'service.name = agentless',
    'kubernetes.deployment.name = agentless-a07f47e7-8dc2-4139-9669-34618b87ba85',
  ],
  meta: {
    related_apm_service: 'agentless-api',
  },
};

describe('EntityFlyout', () => {
  beforeEach(() => {
    mockOpenChat.mockClear();
  });

  const renderFlyout = (props: Partial<React.ComponentProps<typeof EntityFlyout>> = {}) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <EntityFlyout feature={mockFeature} onClose={jest.fn()} {...props} />
        </EuiProvider>
      </I18nProvider>
    );

  it('renders the entity title and badge row', () => {
    renderFlyout();

    expect(screen.getByRole('heading', { name: 'synthetics-task-manager' })).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('82% confidence')).toBeInTheDocument();
    expect(screen.getByText('logs.synthetics')).toBeInTheDocument();
  });

  it('does not render the Service badge for non-service entities', () => {
    renderFlyout({
      feature: { ...mockFeature, subtype: 'database' },
    });

    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.queryByText('Service')).not.toBeInTheDocument();
  });

  it('renders summary, evidence, and raw document sections', () => {
    renderFlyout();

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(mockFeature.description)).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('service.name = agentless')).toBeInTheDocument();
    expect(screen.getByText('Raw document')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftEntityFlyoutRawDocument')).toHaveTextContent(
      'synthetics-task-manager'
    );
  });

  it('renders evidence as a striped list', () => {
    renderFlyout();

    expect(screen.getByTestId('nightshiftEntityFlyoutEvidenceList')).toBeInTheDocument();
    expect(screen.getAllByTestId('nightshiftEntityFlyoutEvidenceItem')).toHaveLength(2);
  });

  it('does not render the APM callout', () => {
    renderFlyout();

    expect(screen.queryByText('APM service with similar name detected')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftEntityFlyoutApmLink')).not.toBeInTheDocument();
  });

  it('opens a new chat with the entity attached when Open in chat is clicked', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('nightshiftEntityFlyoutChatButton'));

    expect(mockOpenChat).toHaveBeenCalledWith({
      newConversation: true,
      autoSendInitialMessage: true,
      initialMessage: 'Tell me about synthetics-task-manager',
      attachments: [
        {
          id: mockFeature.uuid,
          type: KI_FEATURE_ATTACHMENT_TYPE,
          origin: encodeFeatureAttachmentOrigin(mockFeature.stream_name, mockFeature.id),
          description: '[Entity] synthetics-task-manager',
          data: mockFeature,
        },
      ],
    });
  });

  it('calls onClose when the flyout is closed', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });
});
