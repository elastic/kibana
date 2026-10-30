/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { WebCrawlersService } from './web_crawlers_service';

const packagePolicy = {
  id: 'policy-1',
  name: 'Docs crawler',
  policy_ids: ['policy-1'],
  package: { name: 'crawler', version: '0.1.0' },
  created_at: '2026-10-29T10:00:00.000Z',
  inputs: [
    {
      type: 'crawler',
      vars: {
        output_index: { value: 'search-docs' },
        domains: {
          type: 'yaml',
          value:
            '- url: https://docs.example.com\n  seed_urls:\n    - https://docs.example.com/start\n',
        },
        schedule: { value: '0 2 * * *' },
        max_crawl_depth: { value: 3 },
      },
    },
  ],
};

const agent = {
  id: 'agent-1',
  active: true,
  status: 'online',
  policy_id: 'policy-1',
  components: [
    {
      id: 'crawler-default',
      units: [
        {
          id: 'crawler-default-policy-1',
          type: 'input',
          status: 'HEALTHY',
          message: 'Crawl abc running (trigger: action)',
          payload: { crawl: { crawl_id: 'abc', status: 'running', trigger: 'action' } },
        },
      ],
    },
  ],
};

const buildFleet = () => {
  const fleet = {
    agentless: { enabled: true },
    packagePolicyService: {
      list: jest.fn().mockResolvedValue({ items: [packagePolicy] }),
      get: jest.fn().mockResolvedValue(packagePolicy),
      delete: jest.fn().mockResolvedValue([]),
    },
    agentService: {
      asInternalUser: { listAgents: jest.fn().mockResolvedValue({ agents: [agent] }) },
    },
    packageService: {
      asInternalUser: {
        getInstallation: jest.fn().mockResolvedValue(undefined),
        getLatestPackageInfo: jest.fn().mockResolvedValue({ version: '0.1.0' }),
        ensureInstalledPackage: jest.fn().mockResolvedValue({}),
      },
    },
    agentlessPoliciesService: {
      createAgentlessPolicy: jest.fn().mockResolvedValue({ id: 'policy-1' }),
      updateAgentlessPolicy: jest.fn().mockResolvedValue({ id: 'policy-1' }),
      deleteAgentlessPolicy: jest.fn().mockResolvedValue(undefined),
    },
    createFleetActionsClient: jest.fn().mockReturnValue({
      create: jest.fn().mockImplementation(async (action) => action),
    }),
  };
  return fleet as unknown as FleetStartContract & typeof fleet;
};

describe('WebCrawlersService', () => {
  const logger = loggingSystemMock.createLogger();
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  it('lists crawler policies with their agent status and last crawl', async () => {
    const fleet = buildFleet();
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    const crawlers = await service.list();

    expect(fleet.packagePolicyService.list).toHaveBeenCalledWith(
      soClient,
      expect.objectContaining({ kuery: 'fleet-package-policies.package.name:crawler' })
    );
    expect(fleet.agentService.asInternalUser.listAgents).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'policy_id:("policy-1")' })
    );
    expect(crawlers).toEqual([
      {
        id: 'policy-1',
        name: 'Docs crawler',
        agent_policy_ids: ['policy-1'],
        output_index: 'search-docs',
        domains: [
          { url: 'https://docs.example.com', seed_urls: ['https://docs.example.com/start'] },
        ],
        schedule: '0 2 * * *',
        max_crawl_depth: 3,
        status: 'healthy',
        status_message: 'Crawl abc running (trigger: action)',
        last_crawl: { crawl_id: 'abc', status: 'running', trigger: 'action' },
        created_at: '2026-10-29T10:00:00.000Z',
      },
    ]);
  });

  it('reports pending crawlers without an agent and offline agents', async () => {
    const fleet = buildFleet();
    fleet.agentService.asInternalUser.listAgents.mockResolvedValueOnce({ agents: [] });
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);
    expect((await service.list())[0].status).toBe('pending');

    fleet.agentService.asInternalUser.listAgents.mockResolvedValueOnce({
      agents: [{ ...agent, status: 'offline' }],
    });
    expect((await service.list())[0].status).toBe('offline');
  });

  it('creates an agentless policy from the crawler package', async () => {
    const fleet = buildFleet();
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    await service.create({
      name: 'Docs crawler',
      output_index: 'search-docs',
      domains: [{ url: 'https://docs.example.com' }],
      schedule: '0 2 * * *',
      max_crawl_depth: 3,
    });

    expect(fleet.packageService.asInternalUser.ensureInstalledPackage).toHaveBeenCalledWith({
      pkgName: 'crawler',
      pkgVersion: '0.1.0',
    });
    expect(fleet.agentlessPoliciesService.createAgentlessPolicy).toHaveBeenCalledWith({
      package: { name: 'crawler', version: '0.1.0' },
      name: 'Docs crawler',
      namespace: '',
      policy_template: 'crawler',
      inputs: {
        'crawler-crawler': {
          enabled: true,
          vars: {
            output_index: 'search-docs',
            domains: '- url: https://docs.example.com\n',
            schedule: '0 2 * * *',
            max_crawl_depth: 3,
          },
          streams: {},
        },
      },
    });
  });

  it('uses the installed package version when the package is already installed', async () => {
    const fleet = buildFleet();
    fleet.packageService.asInternalUser.getInstallation.mockResolvedValueOnce({ version: '0.0.9' });
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    await service.create({
      name: 'x',
      output_index: 'idx',
      domains: [{ url: 'https://a.example.com' }],
    });

    expect(fleet.packageService.asInternalUser.ensureInstalledPackage).not.toHaveBeenCalled();
    expect(fleet.agentlessPoliciesService.createAgentlessPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ package: { name: 'crawler', version: '0.0.9' } })
    );
  });

  it('updates an existing crawler policy keeping its package version', async () => {
    const fleet = buildFleet();
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    const crawler = await service.update('policy-1', {
      name: 'Docs crawler v2',
      output_index: 'search-docs',
      domains: [{ url: 'https://docs.example.com' }],
    });

    expect(fleet.agentlessPoliciesService.updateAgentlessPolicy).toHaveBeenCalledWith(
      'policy-1',
      expect.objectContaining({
        package: { name: 'crawler', version: '0.1.0' },
        name: 'Docs crawler v2',
        inputs: {
          'crawler-crawler': expect.objectContaining({
            vars: { output_index: 'search-docs', domains: '- url: https://docs.example.com\n' },
          }),
        },
      })
    );
    expect(crawler.id).toBe('policy-1');
  });

  it('deletes the package policy and its agentless agent policy', async () => {
    const fleet = buildFleet();
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    await service.delete('policy-1');

    expect(fleet.packagePolicyService.delete).toHaveBeenCalledWith(soClient, esClient, [
      'policy-1',
    ]);
    expect(fleet.agentlessPoliciesService.deleteAgentlessPolicy).toHaveBeenCalledWith('policy-1');
  });

  it('rejects unknown crawlers', async () => {
    const fleet = buildFleet();
    fleet.packagePolicyService.get.mockResolvedValueOnce(null);
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    await expect(service.delete('nope')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('sends a crawl input action to the running agent', async () => {
    const fleet = buildFleet();
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    const result = await service.startCrawl('policy-1', 'sander');

    expect(fleet.createFleetActionsClient).toHaveBeenCalledWith('crawler');
    const actionsClient = fleet.createFleetActionsClient.mock.results[0].value;
    expect(actionsClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agents: ['agent-1'],
        input_type: 'crawler',
        type: 'INPUT_ACTION',
        user_id: 'sander',
        data: { action: 'crawl' },
      })
    );
    expect(result.action_id).toEqual(expect.any(String));
  });

  it('refuses to start a crawl without a running agent', async () => {
    const fleet = buildFleet();
    fleet.agentService.asInternalUser.listAgents.mockResolvedValue({
      agents: [{ ...agent, status: 'offline' }],
    });
    const service = new WebCrawlersService(fleet, soClient, esClient, logger);

    await expect(service.startCrawl('policy-1', undefined)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});
