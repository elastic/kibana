/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fixtureInputs } from './__fixtures__/forensics_summary_inputs';
import { getForensicsAttachmentIds } from './constants';
import { renderForensicsSummaryHtml } from './render_forensics_summary_html';
import type { RunForensicsSummaryDeps } from './run_forensics_summary';
import { describeForensicsSummary, runForensicsSummary } from './run_forensics_summary';
import type { ForensicsProposal } from './types';
import { buildForensicsSummaryViewModel } from './view_model';

const KI_ID = 'ki-1';
const CONVERSATION_ID = 'investigation-1';
const ids = getForensicsAttachmentIds(KI_ID);
const request = {} as KibanaRequest;

const versioned = (id: string, data: unknown, description?: string): VersionedAttachment => ({
  id,
  type: 'test',
  current_version: 1,
  description,
  versions: [{ version: 1, data, created_at: '2026-11-02T10:00:00Z', content_hash: 'h' }],
});

const evidenceAttachments = (): VersionedAttachment[] => [
  versioned(ids.timeline, fixtureInputs.timeline),
  versioned(ids.iocs, fixtureInputs.iocs),
  versioned('attack-discovery', {
    title: 'Ransomware on {{ host.name win-fin-07 }}',
    alert_ids: ['a1', 'a2', 'a3'],
    mitre_attack_tactics: fixtureInputs.attack?.tactics,
  }),
];

const alertHit = (ruleName: string, severity: string, riskScore: number) => ({
  _id: ruleName,
  _index: '.alerts',
  fields: {
    'kibana.alert.rule.name': [ruleName],
    'kibana.alert.severity': [severity],
    'kibana.alert.risk_score': [riskScore],
  },
});

const PROCESSED_ATTRIBUTES = {
  status: 'processed',
  forensic_verdict: 'confirmed_incident',
  autonomy: 'manual',
};

const setup = ({
  indicator = true,
  indicatorAttributes = PROCESSED_ATTRIBUTES,
  attachments = evidenceAttachments(),
  proposals = fixtureInputs.proposals,
}: {
  indicator?: boolean;
  indicatorAttributes?: Record<string, string>;
  attachments?: VersionedAttachment[];
  proposals?: readonly ForensicsProposal[];
} = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.search.mockImplementation((async (params: { index: string }) => {
    if (params.index.startsWith('ai-index-idx-')) {
      return {
        hits: {
          hits: indicator
            ? [
                {
                  _id: 'doc-1',
                  _index: params.index,
                  _source: {
                    id: KI_ID,
                    updated_at: '2026-11-02T10:15:00.000Z',
                    attributes: indicatorAttributes,
                  },
                },
              ]
            : [],
        },
      };
    }
    return {
      hits: {
        hits: [
          alertHit('LSASS memory dump', 'critical', 99),
          alertHit('Ransomware behavior', 'critical', 95),
          alertHit('Suspicious PowerShell', 'high', 73),
        ],
      },
    };
  }) as unknown as ElasticsearchClient['search']);

  const attachmentsClient = {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  };
  const deps: RunForensicsSummaryDeps = {
    getConversationClient: async () => ({
      get: async () => ({ metadata: { summary: fixtureInputs.summary ?? '' }, attachments }),
    }),
    getAttachmentsClient: async () => attachmentsClient,
    listProposals: jest.fn().mockResolvedValue(proposals),
  };
  const run = (abortSignal?: AbortSignal) =>
    runForensicsSummary({
      request,
      spaceId: 'default',
      conversationId: CONVERSATION_ID,
      esClient,
      abortSignal,
      deps,
    });
  return { esClient, attachmentsClient, deps, run };
};

/** The card as this run would render it from the fixture. */
const expectedCard = (proposals = fixtureInputs.proposals) => {
  const viewModel = buildForensicsSummaryViewModel({
    ...fixtureInputs,
    attack: {
      title: 'Ransomware on win-fin-07',
      tactics: fixtureInputs.attack?.tactics ?? [],
      alertIds: ['a1', 'a2', 'a3'],
    },
    proposals,
  });
  const { html, height } = renderForensicsSummaryHtml(viewModel);
  return {
    data: {
      renderer: 'custom_content',
      query: 'Forensics summary',
      visualization: { template: html, height, title: 'Forensics summary' },
    },
    description: describeForensicsSummary(viewModel),
  };
};

describe('runForensicsSummary', () => {
  it('writes nothing when the Investigation has no finished Endpoint Analysis', async () => {
    const { run, attachmentsClient, deps } = setup({ indicator: false });
    await expect(run()).resolves.toEqual({ skipped: true, reason: 'no_analysis' });
    expect(deps.listProposals).not.toHaveBeenCalled();
    expect(attachmentsClient.create).not.toHaveBeenCalled();
  });

  it('only searches the space and Investigation it was asked about, in any analysis status', async () => {
    const { run, esClient } = setup({ indicator: false });
    await run();
    const filters = JSON.stringify(esClient.search.mock.calls[0][0]);
    expect(filters).toContain('"attributes.space_id":"default"');
    expect(filters).toContain(`"attributes.investigation_id":"${CONVERSATION_ID}"`);
    expect(filters).not.toContain('attributes.status');
  });

  // A supervised proposal can be decided before the run records its verdict.
  it('renders what the Investigation holds while the analysis is still running', async () => {
    const { run, attachmentsClient } = setup({
      indicatorAttributes: { status: 'pending', autonomy: 'supervised' },
    });
    await expect(run()).resolves.toMatchObject({ action: 'created' });
    const [[{ data, description }]] = attachmentsClient.create.mock.calls;
    expect(description).toContain('in progress');
    expect(data.visualization.template).toContain('Analysis in progress');
    expect(data.visualization.template).not.toContain('Analyzed ');
  });

  it('adds the card, shown in the chat, the first time', async () => {
    const { run, attachmentsClient } = setup();
    await expect(run()).resolves.toEqual({
      skipped: false,
      attachment_id: ids.summary,
      action: 'created',
    });
    const { data, description } = expectedCard();
    expect(attachmentsClient.create).toHaveBeenCalledWith({
      conversationId: CONVERSATION_ID,
      id: ids.summary,
      type: 'visualization',
      data,
      description,
      render_inline: true,
      access: 'converse',
    });
  });

  it('skips the write when the card is already current', async () => {
    const { data, description } = expectedCard();
    const { run, attachmentsClient } = setup({
      attachments: [...evidenceAttachments(), versioned(ids.summary, data, description)],
    });
    await expect(run()).resolves.toEqual({
      skipped: true,
      reason: 'unchanged',
      attachment_id: ids.summary,
    });
    expect(attachmentsClient.create).not.toHaveBeenCalled();
    expect(attachmentsClient.update).not.toHaveBeenCalled();
  });

  it('updates the card silently while decisions are still open', async () => {
    const { data, description } = expectedCard([]);
    const { run, attachmentsClient } = setup({
      attachments: [...evidenceAttachments(), versioned(ids.summary, data, description)],
    });
    await expect(run()).resolves.toMatchObject({ action: 'updated' });
    expect(attachmentsClient.update).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: ids.summary, render_inline: false })
    );
  });

  it('posts the card again once the last open decision settles', async () => {
    const before = expectedCard();
    const decided = fixtureInputs.proposals.map((proposal) => ({
      ...proposal,
      status: 'succeeded' as const,
    }));
    const { run, attachmentsClient } = setup({
      attachments: [
        ...evidenceAttachments(),
        versioned(ids.summary, before.data, before.description),
      ],
      proposals: decided,
    });
    await run();
    expect(attachmentsClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        render_inline: true,
        description: expect.stringContaining('0 open decisions'),
      })
    );
  });

  it('writes nothing when a newer run cancels it while it reads', async () => {
    const controller = new AbortController();
    const { run, attachmentsClient, deps } = setup();
    // Cancelled while the proposals, which take no signal, are being read.
    (deps.listProposals as jest.Mock).mockImplementation(async () => {
      controller.abort();
      return fixtureInputs.proposals;
    });
    await expect(run(controller.signal)).resolves.toEqual({ skipped: true, reason: 'cancelled' });
    expect(attachmentsClient.create).not.toHaveBeenCalled();
    expect(attachmentsClient.update).not.toHaveBeenCalled();
  });

  it('passes the abort signal to its searches', async () => {
    const controller = new AbortController();
    const { run, esClient } = setup();
    await run(controller.signal);
    expect(esClient.search).toHaveBeenCalledTimes(2);
    for (const [, options] of esClient.search.mock.calls) {
      expect(options).toEqual({ signal: controller.signal });
    }
  });
});
