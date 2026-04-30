/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { screen } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { PluginContext } from '../../context/plugin_context/plugin_context';
import { SigeventsOverviewPage } from './sigevents_overview';

jest.mock('../../hooks/use_fetch_system_overview', () => ({
  useFetchSystemOverview: () => ({
    loading: false,
    data: undefined,
  }),
}));

jest.mock('../../hooks/use_fetch_latest_significant_event', () => ({
  useFetchLatestSignificantEvent: () => ({
    loading: false,
    error: null,
    data: {
      raw: {},
      state: 'critical',
      blastRadiusScore: 90,
      mainEventTitle: 'Test significant event',
      description: 'Test description',
      impactedServices: [],
      impactedCards: [],
      severityLabel: 'Critical',
      severityColor: 'danger',
      detailFields: {
        id: 'test-event-id',
        label: 'Test significant event',
        subtitle: 'logs · checkout',
        severityLabel: 'Critical',
        severityColor: 'danger',
      },
    },
    refetch: jest.fn(),
  }),
}));

jest.mock('../../components/sigevents_overview', () => ({
  SigeventsOverview: ({
    onViewDetails,
    onRemediate,
  }: {
    onViewDetails?: () => void;
    onRemediate?: () => void;
  }) => (
    <div data-test-subj="sigeventsOverview">
      <button data-test-subj="mockSigeventsViewDetailsButton" onClick={onViewDetails}>
        View Details
      </button>
      <button data-test-subj="mockSigeventsRemediateButton" onClick={onRemediate}>
        Remediate
      </button>
    </div>
  ),
}));

jest.mock('../../components/sigevents_overview/significant_event_detail_body', () => ({
  SignificantEventDetailBody: ({
    event,
    hideHeader,
  }: {
    event: { label: string };
    hideHeader?: boolean;
  }) => (
    <div data-test-subj="mockSignificantEventDetailBody" data-hide-header={String(!!hideHeader)}>
      {event.label}
    </div>
  ),
}));

jest.mock('../../components/sigevents_overview/significant_event_detail_header', () => ({
  SignificantEventDetailHeader: ({ title }: { title: string }) => (
    <div data-test-subj="sigeventsOverviewSignificantEventDetailHeader">{title}</div>
  ),
}));

const mockCore = coreMock.createStart();

const defaultPluginContextValue = {
  ObservabilityPageTemplate: KibanaPageTemplate,
  config: {
    unsafe: { alertDetails: { uptime: { enabled: false } } },
    managedOtlpServiceUrl: '',
  },
};

function renderWithProviders(agentBuilder?: ReturnType<typeof agentBuilderMocks.createStart>) {
  return render(
    <IntlProvider locale="en">
      <EuiThemeProvider>
        <KibanaContextProvider
          services={{
            ...mockCore,
            agentBuilder,
          }}
        >
          <PluginContext.Provider value={defaultPluginContextValue as any}>
            <SigeventsOverviewPage />
          </PluginContext.Provider>
        </KibanaContextProvider>
      </EuiThemeProvider>
    </IntlProvider>
  );
}

describe('SigeventsOverviewPage', () => {
  it('renders page structure with header, SigeventsOverview, and conversation container', () => {
    renderWithProviders();

    expect(screen.getByTestSubject('obltSigeventsOverviewPageHeader')).toBeInTheDocument();
    expect(screen.getByTestSubject('sigeventsOverview')).toBeInTheDocument();
    expect(screen.getByTestSubject('obltSigeventsConversation')).toBeInTheDocument();
  });

  describe('EmbeddableConversation', () => {
    it('renders EmbeddableConversation when agentBuilder is available', () => {
      const mockAgentBuilder = agentBuilderMocks.createStart();
      const MockEmbeddableConversation = jest.fn(({ sessionTag, initialTitle }) => (
        <div data-test-subj="agentBuilderEmbeddableConversation">
          {sessionTag} - {initialTitle}
        </div>
      ));
      mockAgentBuilder.getEmbeddableConversation.mockReturnValue(MockEmbeddableConversation);

      renderWithProviders(mockAgentBuilder);

      expect(screen.getByTestSubject('agentBuilderEmbeddableConversation')).toBeInTheDocument();
      expect(MockEmbeddableConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTag: 'sigevents',
          hideWelcomeTitle: true,
          hideCloseButton: true,
          initialTitle: 'Systems overview',
        }),
        expect.anything()
      );
    });

    it('does not render EmbeddableConversation when agentBuilder is undefined', () => {
      renderWithProviders(undefined);

      expect(
        screen.queryByTestSubject('agentBuilderEmbeddableConversation')
      ).not.toBeInTheDocument();
    });

    it('passes initialMessage to populate input when Remediate is clicked', () => {
      const mockAgentBuilder = agentBuilderMocks.createStart();
      const MockEmbeddableConversation = jest.fn(() => (
        <div data-test-subj="agentBuilderEmbeddableConversation" />
      ));
      mockAgentBuilder.getEmbeddableConversation.mockReturnValue(MockEmbeddableConversation);

      renderWithProviders(mockAgentBuilder);

      fireEvent.click(screen.getByTestSubject('mockSigeventsRemediateButton'));

      expect(MockEmbeddableConversation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          initialMessage: expect.stringContaining('remediate'),
          autoSendInitialMessage: true,
        }),
        expect.anything()
      );
    });
  });

  describe('detail flyout', () => {
    it('does not render the flyout by default', () => {
      renderWithProviders();
      expect(screen.queryByTestSubject('obltSigeventsDetailFlyout')).not.toBeInTheDocument();
    });

    it('opens the push flyout with the significant event header and body when View Details is clicked', () => {
      renderWithProviders();

      fireEvent.click(screen.getByTestSubject('mockSigeventsViewDetailsButton'));

      expect(screen.getByTestSubject('obltSigeventsDetailFlyout')).toBeInTheDocument();
      expect(
        screen.getByTestSubject('sigeventsOverviewSignificantEventDetailHeader')
      ).toBeInTheDocument();
      expect(screen.getByTestSubject('mockSignificantEventDetailBody')).toBeInTheDocument();
      expect(screen.getByTestSubject('mockSignificantEventDetailBody')).toHaveAttribute(
        'data-hide-header',
        'true'
      );
    });

    it('closes the flyout when its close button is clicked', () => {
      renderWithProviders();

      fireEvent.click(screen.getByTestSubject('mockSigeventsViewDetailsButton'));
      expect(screen.getByTestSubject('obltSigeventsDetailFlyout')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByTestSubject('obltSigeventsDetailFlyout')).not.toBeInTheDocument();
    });
  });
});
