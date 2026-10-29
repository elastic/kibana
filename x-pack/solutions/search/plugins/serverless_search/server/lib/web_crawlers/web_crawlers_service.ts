/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'yaml';
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { Agent, PackagePolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type {
  WebCrawler,
  WebCrawlerConfig,
  WebCrawlerCrawl,
  WebCrawlerDomain,
  WebCrawlerStatus,
} from '../../../common/types/web_crawlers';
import { agentUnavailable, notFound } from './errors';

export const CRAWLER_PACKAGE_NAME = 'crawler';
export const CRAWLER_POLICY_TEMPLATE = 'crawler';
export const CRAWLER_INPUT_TYPE = 'crawler';

const CRAWL_ACTION_TIMEOUT_SECONDS = 60;
const CRAWL_ACTION_EXPIRATION_MS = 60 * 60 * 1000;

export class WebCrawlersService {
  constructor(
    private readonly fleet: FleetStartContract,
    private readonly soClient: SavedObjectsClientContract,
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  public async list(): Promise<WebCrawler[]> {
    const { items } = await this.fleet.packagePolicyService.list(this.soClient, {
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${CRAWLER_PACKAGE_NAME}`,
      perPage: 100,
    });
    if (items.length === 0) {
      return [];
    }

    const agents = await this.listAgents(items.flatMap((policy) => policy.policy_ids));
    return items.map((policy) => this.toWebCrawler(policy, agents));
  }

  public async get(id: string): Promise<WebCrawler> {
    const policy = await this.fleet.packagePolicyService.get(this.soClient, id);
    if (policy == null || policy.package?.name !== CRAWLER_PACKAGE_NAME) {
      throw notFound(id);
    }
    const agents = await this.listAgents(policy.policy_ids);
    return this.toWebCrawler(policy, agents);
  }

  public async create(config: WebCrawlerConfig): Promise<WebCrawler> {
    const packageClient = this.fleet.packageService.asInternalUser;
    const packageInfo = await packageClient.getLatestPackageInfo(CRAWLER_PACKAGE_NAME, true);
    await packageClient.ensureInstalledPackage({
      pkgName: CRAWLER_PACKAGE_NAME,
      pkgVersion: packageInfo.version,
    });

    this.logger.info(`Creating agentless web crawler policy "${config.name}"`);
    const policy = await this.fleet.agentlessPoliciesService.createAgentlessPolicy(
      toPolicyPayload(config, packageInfo.version)
    );

    return this.get(policy.id);
  }

  public async update(id: string, config: WebCrawlerConfig): Promise<WebCrawler> {
    const policy = await this.fleet.packagePolicyService.get(this.soClient, id);
    if (policy == null || policy.package?.name !== CRAWLER_PACKAGE_NAME) {
      throw notFound(id);
    }

    this.logger.info(`Updating agentless web crawler policy ${id}`);
    await this.fleet.agentlessPoliciesService.updateAgentlessPolicy(
      id,
      toPolicyPayload(config, policy.package.version)
    );

    return this.get(id);
  }

  public async delete(id: string): Promise<void> {
    const policy = await this.fleet.packagePolicyService.get(this.soClient, id);
    if (policy == null || policy.package?.name !== CRAWLER_PACKAGE_NAME) {
      throw notFound(id);
    }

    this.logger.info(`Deleting web crawler policy ${id}`);
    await this.fleet.packagePolicyService.delete(this.soClient, this.esClient, [policy.id]);
    for (const agentPolicyId of policy.policy_ids) {
      await this.fleet.agentlessPoliciesService.deleteAgentlessPolicy(agentPolicyId);
    }
  }

  public async startCrawl(id: string, userId: string | undefined): Promise<{ action_id: string }> {
    const crawler = await this.get(id);
    const agents = await this.listAgents(crawler.agent_policy_ids);
    const activeAgents = agents.filter((agent) => agent.active && agent.status !== 'offline');
    if (activeAgents.length === 0) {
      throw agentUnavailable(id);
    }

    const now = Date.now();
    const action = await this.fleet.createFleetActionsClient(CRAWLER_PACKAGE_NAME).create({
      '@timestamp': new Date(now).toISOString(),
      action_id: uuidv4(),
      agents: activeAgents.map((agent) => agent.id),
      expiration: new Date(now + CRAWL_ACTION_EXPIRATION_MS).toISOString(),
      input_type: CRAWLER_INPUT_TYPE,
      type: 'INPUT_ACTION',
      timeout: CRAWL_ACTION_TIMEOUT_SECONDS,
      user_id: userId,
      data: { action: 'crawl' },
    });
    this.logger.info(`Requested a crawl for web crawler ${id} (action ${action.action_id})`);
    return { action_id: action.action_id };
  }

  private async listAgents(agentPolicyIds: string[]): Promise<Agent[]> {
    if (agentPolicyIds.length === 0) {
      return [];
    }
    const kuery = `policy_id:(${agentPolicyIds.map((policyId) => `"${policyId}"`).join(' or ')})`;
    const { agents } = await this.fleet.agentService.asInternalUser.listAgents({
      kuery,
      showInactive: true,
      perPage: 100,
    });
    return agents;
  }

  private toWebCrawler(policy: PackagePolicy, agents: Agent[]): WebCrawler {
    const vars = policy.inputs.find((input) => input.type === CRAWLER_INPUT_TYPE)?.vars ?? {};
    const agent = agents.find((candidate) => policy.policy_ids.includes(candidate.policy_id ?? ''));
    const unit = agent?.components
      ?.flatMap((component) => component.units ?? [])
      .find((candidate) => candidate.type === 'input' && candidate.id.includes(policy.id));

    return {
      id: policy.id,
      name: policy.name,
      agent_policy_ids: policy.policy_ids,
      output_index: String(vars.output_index?.value ?? ''),
      domains: parseDomains(vars.domains?.value),
      schedule: vars.schedule?.value || undefined,
      max_crawl_depth: vars.max_crawl_depth?.value ?? undefined,
      status: toStatus(agent, unit?.status),
      status_message: unit?.message,
      last_crawl: unit?.payload?.crawl as WebCrawlerCrawl | undefined,
      created_at: policy.created_at,
    };
  }
}

function toPolicyPayload(config: WebCrawlerConfig, packageVersion: string) {
  return {
    package: { name: CRAWLER_PACKAGE_NAME, version: packageVersion },
    name: config.name,
    namespace: '',
    policy_template: CRAWLER_POLICY_TEMPLATE,
    inputs: {
      [`${CRAWLER_POLICY_TEMPLATE}-${CRAWLER_INPUT_TYPE}`]: {
        enabled: true,
        vars: {
          output_index: config.output_index,
          domains: stringify(config.domains),
          ...(config.schedule ? { schedule: config.schedule } : {}),
          ...(config.max_crawl_depth ? { max_crawl_depth: config.max_crawl_depth } : {}),
        },
        streams: {},
      },
    },
  };
}

function parseDomains(value: unknown): WebCrawlerDomain[] {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }
  try {
    const parsed = parse(value);
    return Array.isArray(parsed) ? (parsed as WebCrawlerDomain[]) : [];
  } catch {
    return [];
  }
}

function toStatus(agent: Agent | undefined, unitStatus: string | undefined): WebCrawlerStatus {
  if (!agent) {
    return 'pending';
  }
  if (agent.status === 'offline' || agent.status === 'inactive' || agent.status === 'unenrolled') {
    return 'offline';
  }
  switch (unitStatus) {
    case 'HEALTHY':
      return 'healthy';
    case 'DEGRADED':
      return 'degraded';
    case 'FAILED':
      return 'failed';
    case 'STOPPED':
    case 'STOPPING':
      return 'stopped';
    default:
      return agent.status === 'error' ? 'failed' : 'pending';
  }
}
