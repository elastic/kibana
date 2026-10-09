/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { AlertZeroPublicPlugin } from './plugin';
import { buildAttachment } from './agent_builder/attachment_types/test_utils';

jest.mock('./agent_builder/attachment_types/threat/threat_inline_content', () => ({
  ThreatAttachmentInlineContent: () => <MockContent name="threat" />,
}));
jest.mock(
  './agent_builder/attachment_types/significant_security_event/significant_security_event_inline_content',
  () => ({ SignificantSecurityEventInlineContent: () => <MockContent name="event" /> })
);

const mockRequest = jest.fn(async (_name: string) => 'loaded');
const mockClients = new Map<string, QueryClient>();
const MockContent = ({ name }: { name: string }) => {
  mockClients.set(name, useQueryClient());
  useQuery({
    queryKey: ['access-test', name],
    queryFn: () => mockRequest(name),
    enabled: name !== 'event',
    retry: false,
  });
  return <div data-test-subj="feature-content">{name}</div>;
};

const setup = (serverless: boolean) => {
  const core = coreMock.createStart();
  // The service-account flag defaults to off. These cases cover license, tier, and the
  // product setting, so the flag stays on.
  core.security.serviceAccounts.isEnabled.mockReturnValue(true);
  const setting$ = new BehaviorSubject(true);
  core.uiSettings.get$.mockReturnValue(setting$);
  core.application.capabilities = {
    ...core.application.capabilities,
    alertzero: { show: true, write: true },
  };
  const license$ = new BehaviorSubject(
    licensingMock.createLicense({ license: { type: 'enterprise', status: 'active' } })
  );
  const plugin = new AlertZeroPublicPlugin(
    coreMock.createPluginInitializerContext(
      { enabled: true },
      { buildFlavor: serverless ? 'serverless' : 'traditional' }
    )
  );
  const agentBuilder = agentBuilderMocks.createStart();
  const contract = plugin.start(core, {
    licensing: { ...licensingMock.createStart(), license$ },
    agentBuilder,
    proposals: {},
    agenticInvestigations: { registerImpactEntityOpener: jest.fn() },
  });
  if (serverless) contract.setServerlessTierAvailable(true);
  return { plugin, agentBuilder, license$, setting$, contract };
};

afterEach(() => {
  mockClients.clear();
  jest.clearAllMocks();
});

describe.each(['threat', 'event'] as const)('%s registered content', (surface) => {
  it.each(['license', 'tier', 'setting'] as const)(
    'unmounts content and stops active queries when %s eligibility changes',
    async (change) => {
      const { plugin, agentBuilder, license$, setting$, contract } = setup(change === 'tier');
      const attachmentClient = new QueryClient();
      const type = surface === 'threat' ? 'security.threat' : 'security.significant_security_event';
      await waitFor(() =>
        expect(agentBuilder.attachments.addAttachmentType).toHaveBeenCalledTimes(2)
      );
      const registration = agentBuilder.attachments.addAttachmentType.mock.calls.find(
        ([id]) => id === type
      );
      if (!registration?.[1].renderInlineContent) throw new Error('Missing attachment renderer');
      const content = registration[1].renderInlineContent({
        attachment: buildAttachment(type, {}),
        isSidebar: false,
      });
      const mounted = render(
        <I18nProvider>
          <QueryClientProvider client={attachmentClient}>
            <React.Suspense fallback={null}>{content}</React.Suspense>
          </QueryClientProvider>
        </I18nProvider>
      );
      await screen.findByTestId('feature-content');
      if (surface !== 'event')
        await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(surface));
      const queryClient = mockClients.get(surface);
      if (!queryClient) throw new Error('Missing query client');

      const setAvailable = (available: boolean) => {
        if (change === 'setting') setting$.next(available);
        else if (change === 'tier') contract.setServerlessTierAvailable(available);
        else
          license$.next(
            licensingMock.createLicense({
              license: { type: available ? 'enterprise' : 'basic', status: 'active' },
            })
          );
      };
      act(() => setAvailable(false));
      expect(screen.queryByTestId('feature-content')).not.toBeInTheDocument();
      expect(
        screen.getByText(
          change === 'setting'
            ? 'AlertZero is not enabled'
            : change === 'tier'
            ? 'Upgrade your subscription'
            : 'Upgrade your license'
        )
      ).toBeInTheDocument();
      mockRequest.mockClear();
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['access-test', surface] });
      });
      expect(mockRequest).not.toHaveBeenCalled();

      act(() => setAvailable(true));
      await screen.findByTestId('feature-content');
      if (surface !== 'event')
        await waitFor(() => expect(mockRequest).toHaveBeenCalledWith(surface));
      expect(agentBuilder.attachments.addAttachmentType).toHaveBeenCalledTimes(2);
      mounted.unmount();
      attachmentClient.clear();
      plugin.stop();
    }
  );
});
