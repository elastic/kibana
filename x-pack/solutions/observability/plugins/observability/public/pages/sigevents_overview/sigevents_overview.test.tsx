/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { screen } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { PluginContext } from '../../context/plugin_context/plugin_context';
import { SigeventsOverviewPage } from './sigevents_overview';

jest.mock('../../components/sigevents_overview', () => ({
  SigeventsOverview: () => <div data-test-subj="sigeventsOverview">SigeventsOverview</div>,
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
  });
});
