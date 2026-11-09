/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { InvestigationLocatorDefinition } from '../../common/locators';
import type { SlackBlock } from '../lib/notifications/render_investigation_slack_message';
import { renderSlackMessageStepDefinition } from './render_slack_message';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const setup = (spaceId = 'default') => {
  const request = httpServerMock.createKibanaRequest({ spaceId: brandSpaceId(spaceId) });
  const getNotifiableInvestigation = jest.fn(async () => ({
    investigation_id: 'inv-1',
    title: 'Checkout latency spike',
    verdict: 'A bad deploy saturated the database pool.',
  }));
  const getInvestigationsClient = jest.fn(() => ({ getNotifiableInvestigation })) as never;
  const urlService = new MockUrlService();
  const definition = renderSlackMessageStepDefinition({
    investigationLocator: urlService.locators.create(new InvestigationLocatorDefinition()),
    getInvestigationsClient,
    getRuntime: isomerPluginMock.createStartContract().getRuntime,
  });
  const context = (input: Record<string, unknown>) =>
    ({
      input,
      rawInput: input,
      contextManager: {
        getFakeRequest: () => request,
        getContext: () => ({
          kibanaUrl: 'https://kibana.example',
          execution: { id: 'exec-1' },
          workflow: { spaceId },
        }),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
    } as never);
  return { definition, request, getInvestigationsClient, getNotifiableInvestigation, context };
};

const buttonUrl = (blocks: SlackBlock[]) => {
  const [button] = (blocks.find(({ type }) => type === 'actions')?.elements ?? []) as Array<{
    url: string;
  }>;
  return button?.url ?? '';
};

describe('nightshift.renderSlackMessage step', () => {
  it.each(['default', 'ops'])(
    'renders the investigation looked up with the workflow request in the %s space',
    async (spaceId) => {
      const { definition, request, getInvestigationsClient, getNotifiableInvestigation, context } =
        setup(spaceId);
      const { output } = (await definition.handler(
        context({ investigation_id: 'inv-1', phase: 'completed' })
      )) as { output: { text: string; blocks: SlackBlock[] } };

      expect(getInvestigationsClient).toHaveBeenCalledWith(request, spaceId);
      expect(getNotifiableInvestigation).toHaveBeenCalledWith('inv-1');
      expect(output.text).toContain('Checkout latency spike');
      expect(JSON.stringify(output.blocks)).toContain('A bad deploy saturated the database pool.');
      const prefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
      expect(buttonUrl(output.blocks)).toMatch(
        new RegExp(`^https://kibana\\.example${prefix}/app/r\\?`)
      );
      // The fallback is mrkdwn, where `&` is escaped; Slack shows and links it as `&`.
      expect(output.text).toContain(buttonUrl(output.blocks).replace(/&/g, '&amp;'));
    }
  );

  it('passes the failure reason through', async () => {
    const { definition, context } = setup();
    const { output } = (await definition.handler(
      context({ investigation_id: 'inv-1', phase: 'failed', reason: 'Agent timed out' })
    )) as { output: { blocks: SlackBlock[] } };
    expect(JSON.stringify(output.blocks)).toContain('Agent timed out');
  });

  it('fails when the investigation cannot be read', async () => {
    const { definition, getNotifiableInvestigation, context } = setup();
    getNotifiableInvestigation.mockRejectedValue(new Error('Investigation not found'));
    await expect(
      definition.handler(context({ investigation_id: 'inv-1', phase: 'completed' }))
    ).rejects.toThrow('Investigation not found');
  });

  it('validates the phase', () => {
    const { definition } = setup();
    expect(
      definition.inputSchema.safeParse({ investigation_id: 'inv-1', phase: 'progress' }).success
    ).toBe(false);
  });
});
