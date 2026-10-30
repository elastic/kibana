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

// The crawler creates its output index, indexes documents into it, and searches and deletes
// outdated documents when purging. The agent's own output API key cannot be used: Fleet Server
// mints it and its service account has no privileges on arbitrary (e.g. `search-*`) indices.
const CRAWL_INDEX_PRIVILEGES = [
  'auto_configure',
  'create_index',
  'delete',
  'maintenance',
  'monitor',
  'read',
  'view_index_metadata',
  'write',
];

interface CrawlerApiKey {
  id: string;
  encoded: string;
}

export class WebCrawlersService {
  constructor(
    private readonly fleet: FleetStartContract,
    private readonly soClient: SavedObjectsClientContract,
    // scoped to the current user: the crawler's API key is created on their behalf
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
    const version = await this.packageVersion();
    const apiKey = await this.createApiKey(config);

    this.logger.info(`Creating agentless web crawler policy "${config.name}"`);
    let policy;
    try {
      policy = await this.fleet.agentlessPoliciesService.createAgentlessPolicy(
        toPolicyPayload(config, version, apiKey)
      );
    } catch (error) {
      await this.invalidateApiKey(apiKey.id);
      throw error;
    }

    return this.get(policy.id);
  }

  public async update(id: string, config: WebCrawlerConfig): Promise<WebCrawler> {
    const policy = await this.fleet.packagePolicyService.get(this.soClient, id);
    if (policy == null || policy.package?.name !== CRAWLER_PACKAGE_NAME) {
      throw notFound(id);
    }

    // the key is rotated on every update so that it always matches the configured index
    const previousApiKeyId = apiKeyIdOf(policy);
    const apiKey = await this.createApiKey(config);

    this.logger.info(`Updating agentless web crawler policy ${id}`);
    try {
      await this.fleet.agentlessPoliciesService.updateAgentlessPolicy(
        id,
        toPolicyPayload(config, policy.package.version, apiKey)
      );
    } catch (error) {
      await this.invalidateApiKey(apiKey.id);
      throw error;
    }
    if (previousApiKeyId) {
      await this.invalidateApiKey(previousApiKeyId);
    }

    return this.get(id);
  }

  public async delete(id: string): Promise<void> {
    const policy = await this.fleet.packagePolicyService.get(this.soClient, id);
    if (policy == null || policy.package?.name !== CRAWLER_PACKAGE_NAME) {
      throw notFound(id);
    }

    this.logger.info(`Deleting web crawler policy ${id}`);
    // removes the package policy, its agent policy and the agentless deployment
    await this.fleet.agentlessPoliciesService.deleteAgentlessPolicy(policy.id, { force: true });

    const apiKeyId = apiKeyIdOf(policy);
    if (apiKeyId) {
      await this.invalidateApiKey(apiKeyId);
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

  // An already installed package (for example uploaded during development) is used as is;
  // otherwise the latest version known to the registry is installed
  private async packageVersion(): Promise<string> {
    const packageClient = this.fleet.packageService.asInternalUser;
    const installation = await packageClient.getInstallation(CRAWLER_PACKAGE_NAME);
    if (installation?.version) {
      return installation.version;
    }
    const packageInfo = await packageClient.getLatestPackageInfo(CRAWLER_PACKAGE_NAME, true);
    await packageClient.ensureInstalledPackage({
      pkgName: CRAWLER_PACKAGE_NAME,
      pkgVersion: packageInfo.version,
    });
    return packageInfo.version;
  }

  // An API key limited to the crawl index, created on behalf of the current user so that the
  // crawler can never do more than they can
  private async createApiKey(config: WebCrawlerConfig): Promise<CrawlerApiKey> {
    const { id, encoded } = await this.esClient.security.createApiKey({
      name: `web-crawler-${config.output_index}`,
      role_descriptors: {
        'web-crawler': {
          // `monitor` lets the crawler read the cluster info it checks on connecting
          cluster: ['monitor'],
          indices: [{ names: [config.output_index], privileges: CRAWL_INDEX_PRIVILEGES }],
        },
      },
      metadata: { managed_by: 'serverless_search', web_crawler: config.name },
    });
    return { id, encoded };
  }

  private async invalidateApiKey(apiKeyId: string): Promise<void> {
    try {
      await this.esClient.security.invalidateApiKey({ ids: [apiKeyId] });
    } catch (error) {
      this.logger.warn(`Could not invalidate web crawler API key ${apiKeyId}: ${error.message}`);
    }
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

function apiKeyIdOf(policy: PackagePolicy): string | undefined {
  const vars = policy.inputs.find((input) => input.type === CRAWLER_INPUT_TYPE)?.vars;
  const value = vars?.api_key_id?.value;
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function toPolicyPayload(config: WebCrawlerConfig, packageVersion: string, apiKey: CrawlerApiKey) {
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
          api_key: apiKey.encoded,
          api_key_id: apiKey.id,
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
