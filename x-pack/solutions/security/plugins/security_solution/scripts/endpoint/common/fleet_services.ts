/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, memoize, pick } from 'lodash';
import type { Client, estypes } from '@elastic/elasticsearch';
import type {
  Agent,
  AgentPolicy,
  AgentStatus,
  CopyAgentPolicyResponse,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  GetAgentPoliciesRequest,
  GetAgentPoliciesResponse,
  GetAgentsResponse,
  GetInfoResponse,
  GetOneAgentPolicyResponse,
  GetOnePackagePolicyResponse,
  GetPackagePoliciesRequest,
  GetPackagePoliciesResponse,
  PackagePolicy,
  PostFleetSetupResponse,
  UpdatePackagePolicyResponse,
} from '@kbn/fleet-plugin/common';
import {
  AGENT_API_ROUTES,
  AGENT_POLICY_API_ROUTES,
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  agentPolicyRouteService,
  agentRouteService,
  AGENTS_INDEX,
  API_VERSIONS,
  APP_API_ROUTES,
  epmRouteService,
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SETUP_API_ROUTE,
  packagePolicyRouteService,
} from '@kbn/fleet-plugin/common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { GetFleetServerHostsResponse } from '@kbn/fleet-plugin/common/types/rest_spec/fleet_server_hosts';
import {
  enrollmentAPIKeyRouteService,
  fleetServerHostsRoutesService,
  outputRoutesService,
} from '@kbn/fleet-plugin/common/services';
import type {
  CopyAgentPolicyRequest,
  DeleteAgentPolicyResponse,
  EnrollmentAPIKey,
  GenerateServiceTokenResponse,
  GetActionStatusResponse,
  GetAgentsRequest,
  GetEnrollmentAPIKeysResponse,
  GetOutputsResponse,
  PostAgentUnenrollResponse,
  UpdateAgentPolicyRequest,
  UpdateAgentPolicyResponse,
  PostNewAgentActionResponse,
  InstallPackageResponse,
  FleetServerAgent,
} from '@kbn/fleet-plugin/common/types';
import semver from 'semver';
import axios from 'axios';
import { userInfo } from 'os';
import pRetry from 'p-retry';
import { getPolicyDataForUpdate } from '../../../common/endpoint/service/policy';
import { fetchActiveSpace } from './spaces';
import { fetchKibanaStatus } from '../../../common/endpoint/utils/kibana_status';
import { isFleetServerRunning } from './fleet_server/fleet_server_services';
import { getEndpointPackageInfo } from '../../../common/endpoint/utils/package';
import type { DownloadAndStoreAgentResponse } from './agent_downloads_service';
import { downloadAndStoreAgent } from './agent_downloads_service';
import type { HostVm } from './types';
import {
  createToolingLogger,
  RETRYABLE_TRANSIENT_ERRORS,
  retryOnError,
} from '../../../common/endpoint/data_loaders/utils';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import { FleetAgentGenerator } from '../../../common/endpoint/data_generators/fleet_agent_generator';
import type { PolicyData } from '../../../common/endpoint/types';

const fleetGenerator = new FleetAgentGenerator();
const CURRENT_USERNAME = userInfo().username.toLowerCase();
const DEFAULT_AGENT_POLICY_NAME = `${CURRENT_USERNAME} test policy`;

/** A Fleet agent policy that includes integrations that don't actually require an agent to run on a host. Example: SenttinelOne */
export const DEFAULT_AGENTLESS_INTEGRATIONS_AGENT_POLICY_NAME = `${CURRENT_USERNAME} - agentless integrations`;

/**
 * Generate a random policy name
 */
export const randomAgentPolicyName = (() => {
  let counter = fleetGenerator.randomN(100);

  return (prefix: string = 'agent policy'): string => {
    return `${prefix} - ${fleetGenerator.randomString(10)}_${counter++}`;
  };
})();

/**
 * Check if the given version string is a valid artifact version
 * @param version Version string
 */
const isValidArtifactVersion = (version: string) => !!version.match(/^\d+\.\d+\.\d+(-SNAPSHOT)?$/);

const getAgentPolicyDataForUpdate = (
  agentPolicy: AgentPolicy
): UpdateAgentPolicyRequest['body'] => {
  return pick(agentPolicy, [
    'advanced_settings',
    'agent_features',
    'data_output_id',
    'description',
    'download_source_id',
    'fleet_server_host_id',
    'global_data_tags',
    'agentless',
    'has_fleet_server',
    'id',
    'inactivity_timeout',
    'is_default',
    'is_default_fleet_server',
    'is_managed',
    'is_protected',
    'keep_monitoring_alive',
    'monitoring_diagnostics',
    'monitoring_enabled',
    'monitoring_http',
    'monitoring_output_id',
    'monitoring_pprof_enabled',
    'name',
    'namespace',
    'overrides',
    'space_ids',
    'supports_agentless',
    'unenroll_timeout',
  ]) as UpdateAgentPolicyRequest['body'];
};

/**
 * Assigns an existing Fleet agent to a new policy.
 * NOTE: should only be used on mocked data.
 */
export const assignFleetAgentToNewPolicy = async ({
  esClient,
  kbnClient,
  agentId,
  newAgentPolicyId,
  logger = createToolingLogger(),
}: {
  esClient: Client;
  kbnClient: KbnClient;
  agentId: string;
  newAgentPolicyId: string;
  logger?: ToolingLog;
}): Promise<void> => {
  const agentPolicy = await fetchAgentPolicy(kbnClient, newAgentPolicyId);
  const update: Partial<FleetServerAgent> = {
    ...buildFleetAgentCheckInUpdate(),
    policy_id: newAgentPolicyId,
    namespaces: agentPolicy.space_ids ?? [],
  };

  logger.verbose(
    `update to agent id [${agentId}] showing assignment to new policy ID [${newAgentPolicyId}]:\n${JSON.stringify(
      update,
      null,
      2
    )}`
  );

  await esClient
    .update({
      index: AGENTS_INDEX,
      id: agentId,
      refresh: 'wait_for',
      retry_on_conflict: 5,
      doc: update,
    })
    .catch(catchAxiosErrorFormatAndThrow);
};

type FleetAgentCheckInUpdateDoc = Pick<
  FleetServerAgent,
  | 'last_checkin_status'
  | 'last_checkin'
  | 'active'
  | 'unenrollment_started_at'
  | 'unenrolled_at'
  | 'upgrade_started_at'
  | 'upgraded_at'
>;
const buildFleetAgentCheckInUpdate = (
  agentStatus: AgentStatus | 'random' = 'online'
): FleetAgentCheckInUpdateDoc => {
  const fleetAgentStatus =
    agentStatus === 'random' ? fleetGenerator.randomAgentStatus() : agentStatus;

  const update = pick(fleetGenerator.generateEsHitWithStatus(fleetAgentStatus)._source, [
    'last_checkin_status',
    'last_checkin',
    'active',
    'unenrollment_started_at',
    'unenrolled_at',
    'upgrade_started_at',
    'upgraded_at',
  ]) as FleetAgentCheckInUpdateDoc;

  // WORKAROUND: Endpoint API will exclude metadata for any fleet agent whose status is `inactive`,
  // which means once we update the Fleet agent with that status, the metadata api will no longer
  // return the endpoint host info.'s. So - we avoid that here.
  update.active = true;

  // Ensure any `undefined` value is set to `null` for the update
  (Object.keys(update) as Array<keyof FleetAgentCheckInUpdateDoc>).forEach((key) => {
    if (update[key] === undefined) {
      // @ts-expect-error - Setting undefined values to null for ES update
      update[key] = null;
    }
  });

  return update;
};

/**
 * Checks a Fleet agent in by updating the agent record directly in the `.fleet-agent` index.
 * @param esClient
 * @param agentId
 * @param agentStatus
 * @param log
 */
export const checkInFleetAgent = async (
  esClient: Client,
  agentId: string,
  {
    agentStatus = 'online',
    log = createToolingLogger(),
  }: Partial<{
    /** The agent status to be sent. If set to `random`, then one will be randomly generated */
    agentStatus: AgentStatus | 'random';
    log: ToolingLog;
  }> = {}
): Promise<estypes.UpdateResponse> => {
  const update = buildFleetAgentCheckInUpdate(agentStatus);

  log.verbose(
    `update to fleet agent [${agentId}][${agentStatus} / ${update.last_checkin_status}]: `,
    update
  );

  return esClient
    .update({
      index: AGENTS_INDEX,
      id: agentId,
      refresh: 'wait_for',
      retry_on_conflict: 5,
      doc: update,
    })
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Query Fleet Agents API
 *
 * @param kbnClient
 * @param options
 */
export const fetchFleetAgents = async (
  kbnClient: KbnClient,
  options: GetAgentsRequest['query']
): Promise<GetAgentsResponse> => {
  return kbnClient
    .request<GetAgentsResponse>({
      method: 'GET',
      path: AGENT_API_ROUTES.LIST_PATTERN,
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      query: options,
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};

/**
 * Will keep querying Fleet list of agents until the given `hostname` shows up as healthy
 *
 * @param kbnClient
 * @param log
 * @param hostname
 * @param timeoutMs
 * @param esClient
 */
export const waitForHostToEnroll = async (
  kbnClient: KbnClient,
  log: ToolingLog,
  hostname: string,
  timeoutMs: number = 30000,
  esClient: Client | undefined = undefined
): Promise<Agent> => {
  log.info(`Waiting for agent with hostname [${hostname}] to enroll with fleet`);

  const started = new Date();
  const hasTimedOut = (): boolean => {
    const elapsedTime = Date.now() - started.getTime();
    return elapsedTime > timeoutMs;
  };
  let found: Agent | undefined;
  let agentId: string | undefined;

  while (!found && !hasTimedOut()) {
    found = await retryOnError(async () => {
      const kuery = `(local_metadata.host.hostname.keyword : "${hostname}")`;

      return fetchFleetAgents(kbnClient, {
        perPage: 1,
        kuery,
        showInactive: false,
      }).then((response) => {
        agentId = response.items[0]?.id;
        return response.items.filter((agent) => agent.status === 'online')[0];
      });
    }, RETRYABLE_TRANSIENT_ERRORS);

    if (!found) {
      // sleep and check again
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!found) {
    throw Object.assign(
      new Error(
        `Timed out waiting for agent with hostname [${hostname}] to show up in Fleet. Waited ${
          timeoutMs / 1000
        } seconds`
      ),
      { agentId, hostname }
    );
  }

  log.info(`✓ Agent enrolled successfully`);
  log.verbose(`Agent details:`, found);

  // Workaround for united metadata sometimes being unable to find docs in .fleet-agents index. This
  // seems to be a timing issue with the index refresh.
  await esClient?.search({
    index: AGENTS_INDEX,
  });

  return found;
};

export const fetchFleetServerHostList = async (
  kbnClient: KbnClient
): Promise<GetFleetServerHostsResponse> => {
  return kbnClient
    .request<GetFleetServerHostsResponse>({
      method: 'GET',
      path: fleetServerHostsRoutesService.getListPath(),
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Returns the URL for the default Fleet Server connected to the stack
 * @param kbnClient
 */
export const fetchFleetServerUrl = async (kbnClient: KbnClient): Promise<string | undefined> => {
  const fleetServerListResponse = await fetchFleetServerHostList(kbnClient);

  // TODO:PT need to also pull in the Proxies and use that instead if defined for url?

  let url: string | undefined;

  for (const fleetServer of fleetServerListResponse.items) {
    if (!url || fleetServer.is_default) {
      url = fleetServer.host_urls[0];

      if (fleetServer.is_default) {
        break;
      }
    }
  }

  return url;
};

/**
 * Retrieve the API enrollment key for a given FLeet Agent Policy
 * @param kbnClient
 * @param agentPolicyId
 */
export const fetchAgentPolicyEnrollmentKey = async (
  kbnClient: KbnClient,
  agentPolicyId: string
): Promise<string | undefined> => {
  const apiKey: EnrollmentAPIKey | undefined = await kbnClient
    .request<GetEnrollmentAPIKeysResponse>({
      method: 'GET',
      path: enrollmentAPIKeyRouteService.getListPath(),
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      query: { kuery: `policy_id: "${agentPolicyId}"` },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data.items[0]);

  if (!apiKey) {
    return;
  }

  return apiKey.api_key;
};

/**
 * Retrieves a list of Fleet Agent policies
 * @param kbnClient
 * @param options
 */
export const fetchAgentPolicyList = async (
  kbnClient: KbnClient,
  options: GetAgentPoliciesRequest['query'] = {}
) => {
  return kbnClient
    .request<GetAgentPoliciesResponse>({
      method: 'GET',
      path: agentPolicyRouteService.getListPath(),
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      query: options,
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Fetch a single Fleet Agent Policy
 * @param kbnClient
 * @param agentPolicyId
 */
export const fetchAgentPolicy = async (
  kbnClient: KbnClient,
  agentPolicyId: string
): Promise<AgentPolicy> => {
  return kbnClient
    .request<GetOneAgentPolicyResponse>({
      method: 'GET',
      path: agentPolicyRouteService.getInfoPath(agentPolicyId),
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .then((response) => response.data.item)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Delete a single Fleet Agent Policy
 * @param kbnClient
 * @param agentPolicyId
 */
export const deleteAgentPolicy = async (
  kbnClient: KbnClient,
  agentPolicyId: string
): Promise<DeleteAgentPolicyResponse> => {
  return kbnClient
    .request<DeleteAgentPolicyResponse>({
      method: 'POST',
      path: agentPolicyRouteService.getDeletePath(),
      body: {
        agentPolicyId,
      },
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Retrieves a list of Fleet Integration policies
 * @param kbnClient
 * @param options
 */
export const fetchIntegrationPolicyList = async (
  kbnClient: KbnClient,
  options: GetPackagePoliciesRequest['query'] = {}
): Promise<GetPackagePoliciesResponse> => {
  return kbnClient
    .request<GetPackagePoliciesResponse>({
      method: 'GET',
      path: PACKAGE_POLICY_API_ROUTES.LIST_PATTERN,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
      query: options,
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Returns the Agent Version that matches the current stack version. Will use `SNAPSHOT` if
 * appropriate too.
 * @param kbnClient
 * @param log
 */
export const getAgentVersionMatchingCurrentStack = async (
  kbnClient: KbnClient,
  log: ToolingLog = createToolingLogger()
): Promise<string> => {
  const kbnStatus = await fetchKibanaStatus(kbnClient);

  log.debug(`Kibana status:\n`, kbnStatus);

  if (!kbnStatus.version) {
    throw new Error(
      `Kibana status api response did not include 'version' information - possibly due to invalid credentials`
    );
  }

  const agentVersions = await pRetry<string[]>(
    async () => {
      return axios
        .get('https://artifacts-api.elastic.co/v1/versions')
        .catch(catchAxiosErrorFormatAndThrow)
        .then((response) =>
          map(
            response.data.versions.filter(isValidArtifactVersion),
            (version) => version.split('-SNAPSHOT')[0]
          )
        );
    },
    { maxTimeout: 10000 }
  );

  let version =
    semver.maxSatisfying(agentVersions, `<=${kbnStatus.version.number}`) ??
    kbnStatus.version.number;

  // Add `-SNAPSHOT` if version indicates it was from a snapshot or the build hash starts
  // with `xxxxxxxxx` (value that seems to be present when running kibana from source)
  if (
    kbnStatus.version.build_snapshot ||
    kbnStatus.version.build_hash.startsWith('XXXXXXXXXXXXXXX')
  ) {
    version += '-SNAPSHOT';
  }

  return version;
};

// Generates a file name using system arch and an agent version.
export const getAgentFileName = (
  agentVersion: string,
  os?: 'linux' | 'windows' | 'darwin',
  arch?: 'auto' | 'x86_64' | 'arm64'
): string => {
  const targetOs = os || 'linux';

  // Determine architecture
  let downloadArch: string;
  if (arch === 'auto' || !arch) {
    // Use host machine architecture
    downloadArch =
      { arm64: 'arm64', x64: 'x86_64' }[process.arch as string] ??
      `UNSUPPORTED_ARCHITECTURE_${process.arch}`;
  } else {
    // Use explicitly specified architecture
    downloadArch = arch;
  }

  // macOS uses 'aarch64' instead of 'arm64' in Elastic Agent filenames
  if (targetOs === 'darwin' && downloadArch === 'arm64') {
    downloadArch = 'aarch64';
  }

  return `elastic-agent-${agentVersion}-${targetOs}-${downloadArch}`;
};

interface ElasticArtifactSearchResponse {
  manifest: {
    'last-update-time': string;
    'seconds-since-last-update': number;
  };
  packages: {
    [packageFileName: string]: {
      architecture: string;
      os: string[];
      type: string;
      asc_url: string;
      sha_url: string;
      url: string;
    };
  };
}

interface GetAgentDownloadUrlResponse {
  url: string;
  /** The file name (ex. the `*.tar.gz` file) */
  fileName: string;
  /** The directory name that the download archive will be extracted to (same as `fileName` but no file extensions) */
  dirName: string;
}

/**
 * Retrieves the download URL to the installation package for a given version of the Elastic Agent
 * @param version
 * @param closestMatch
 * @param log
 * @param os Target OS for the agent (linux, windows, darwin)
 * @param arch Target architecture (auto, x86_64, arm64)
 * @param staging Use staging builds instead of snapshot builds
 */
export const getAgentDownloadUrl = async (
  version: string,
  /**
   * When set to true a check will be done to determine the latest version of the agent that
   * is less than or equal to the `version` provided
   */
  closestMatch: boolean = false,
  log?: ToolingLog,
  os?: 'linux' | 'windows' | 'darwin',
  arch?: 'auto' | 'x86_64' | 'arm64',
  staging: boolean = false
): Promise<GetAgentDownloadUrlResponse> => {
  const agentVersion = closestMatch ? await getLatestAgentDownloadVersion(version, log) : version;
  const targetOs = os || 'linux';
  const targetArch = arch || 'auto';

  // For staging builds, hardcode the URL (temporary solution)
  if (staging) {
    // Hardcoded staging build version and hash
    const stagingVersion = '9.2.0';
    const stagingBuildHash = '65fce82d';

    const fileNameWithoutExtension = getAgentFileName(stagingVersion, targetOs, targetArch);
    const fileExtension = targetOs === 'windows' ? '.zip' : '.tar.gz';
    const agentFile = `${fileNameWithoutExtension}${fileExtension}`;

    const stagingUrl = `https://staging.elastic.co/${stagingVersion}-${stagingBuildHash}/downloads/beats/elastic-agent/${agentFile}`;

    log?.verbose(`Using hardcoded staging build URL for ${targetOs}:\n    ${stagingUrl}`);

    return {
      url: stagingUrl,
      fileName: agentFile,
      dirName: fileNameWithoutExtension,
    };
  }

  const fileNameWithoutExtension = getAgentFileName(agentVersion, targetOs, targetArch);
  // Use .zip for Windows, .tar.gz for Linux/macOS
  const fileExtension = targetOs === 'windows' ? '.zip' : '.tar.gz';
  const agentFile = `${fileNameWithoutExtension}${fileExtension}`;
  const artifactSearchUrl = `https://artifacts-api.elastic.co/v1/search/${agentVersion}/${agentFile}`;

  log?.verbose(
    `Retrieving elastic agent download URL for ${targetOs} from:\n    ${artifactSearchUrl}`
  );

  const searchResult: ElasticArtifactSearchResponse = await pRetry(
    async () => {
      return axios
        .get<ElasticArtifactSearchResponse>(artifactSearchUrl)
        .catch(catchAxiosErrorFormatAndThrow)
        .then((response) => {
          return response.data;
        });
    },
    { maxTimeout: 10000 }
  );

  log?.verbose(searchResult);

  if (!searchResult.packages[agentFile]) {
    throw new Error(`Unable to find an Agent download URL for version [${agentVersion}]`);
  }

  // The artifacts API returns the correct URL for snapshot builds
  return {
    url: searchResult.packages[agentFile].url,
    fileName: agentFile,
    dirName: fileNameWithoutExtension,
  };
};

/**
 * Given a stack version number, function will return the closest Agent download version available
 * for download. THis could be the actual version passed in or lower.
 * @param version
 * @param log
 */
export const getLatestAgentDownloadVersion = async (
  version: string,
  log?: ToolingLog
): Promise<string> => {
  const artifactsUrl = 'https://artifacts-api.elastic.co/v1/versions';
  const semverMatch = `<=${version.replace(`-SNAPSHOT`, '')}`;
  const artifactVersionsResponse: { versions: string[] } = await pRetry(
    async () => {
      return axios
        .get<{ versions: string[] }>(artifactsUrl)
        .catch(catchAxiosErrorFormatAndThrow)
        .then((response) => {
          return response.data;
        });
    },
    { maxTimeout: 10000 }
  );

  const stackVersionToArtifactVersion: Record<string, string> = artifactVersionsResponse.versions
    .filter(isValidArtifactVersion)
    .reduce((acc, artifactVersion) => {
      const stackVersion = artifactVersion.split('-SNAPSHOT')[0];
      acc[stackVersion] = artifactVersion;
      return acc;
    }, {} as Record<string, string>);

  log?.verbose(
    `Versions found from [${artifactsUrl}]:\n${JSON.stringify(
      stackVersionToArtifactVersion,
      null,
      2
    )}`
  );

  const matchedVersion = semver.maxSatisfying(
    Object.keys(stackVersionToArtifactVersion),
    semverMatch
  );

  log?.verbose(`Matched [${matchedVersion}] for .maxStatisfying(${semverMatch})`);

  if (!matchedVersion) {
    throw new Error(`Unable to find a semver version that meets ${semverMatch}`);
  }

  return stackVersionToArtifactVersion[matchedVersion];
};

/**
 * Un-enrolls a Fleet agent
 *
 * @param kbnClient
 * @param agentId
 * @param force
 */
export const unEnrollFleetAgent = async (
  kbnClient: KbnClient,
  agentId: string,
  force = false
): Promise<PostAgentUnenrollResponse> => {
  const { data } = await kbnClient
    .request<PostAgentUnenrollResponse>({
      method: 'POST',
      path: agentRouteService.getUnenrollPath(agentId),
      body: { revoke: force },
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
    })
    .catch(catchAxiosErrorFormatAndThrow);

  return data;
};

/**
 * Un-enrolls a Fleet agent
 *
 * @param kbnClient
 * @param policyId
 */
export const getAgentPolicyEnrollmentKey = async (
  kbnClient: KbnClient,
  policyId: string
): Promise<string> => {
  const { data } = await kbnClient
    .request<GetEnrollmentAPIKeysResponse>({
      method: 'GET',
      path: enrollmentAPIKeyRouteService.getListPath(),
      query: {
        policy_id: policyId,
      },
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
    })
    .catch(catchAxiosErrorFormatAndThrow);

  return data.items?.[0]?.api_key;
};

export const generateFleetServiceToken = async (
  kbnClient: KbnClient,
  logger: ToolingLog
): Promise<string> => {
  logger.info(`Generating new Fleet Service Token`);

  const serviceToken: string = await kbnClient
    .request<GenerateServiceTokenResponse>({
      method: 'POST',
      path: APP_API_ROUTES.GENERATE_SERVICE_TOKEN_PATTERN,
      headers: { 'elastic-api-version': '2023-10-31' },
      body: {},
    })
    .then((response) => response.data.value)
    .catch(catchAxiosErrorFormatAndThrow);

  logger.verbose(`New service token created: ${serviceToken}`);

  return serviceToken;
};

export const fetchFleetOutputs = async (kbnClient: KbnClient): Promise<GetOutputsResponse> => {
  return kbnClient
    .request<GetOutputsResponse>({
      method: 'GET',
      path: outputRoutesService.getListPath(),
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .then((response) => response.data)
    .catch(catchAxiosErrorFormatAndThrow);
};

export const getFleetElasticsearchOutputHost = async (
  kbnClient: KbnClient,
  log: ToolingLog = createToolingLogger()
): Promise<string> => {
  const outputs = await fetchFleetOutputs(kbnClient);
  let host: string = '';

  for (const output of outputs.items) {
    if (output.type === 'elasticsearch') {
      host = output?.hosts?.[0] ?? '';
    }
  }

  if (!host) {
    log.error(`Outputs returned from Fleet:\n${JSON.stringify(outputs, null, 2)}`);
    throw new Error(`An output for Elasticsearch was not found in Fleet settings`);
  }

  return host;
};

type PlatformType = 'windows' | 'darwin' | 'linux';
type ServiceStatus = 'running' | 'stopped' | 'unknown';

interface PlatformEnrollmentStrategy {
  generateDownloadCommand(url: string, destPath: string): string;

  generateExtractCommand(archivePath: string, destDir: string): string;

  getArchiveExtension(): string;

  getDefaultDownloadPath(filename: string): string;

  generateInstallCommand(agentPath: string, fleetUrl: string, enrollmentToken: string): string;

  generateHostnameCommand(hostname: string): string;

  requiresRestartAfterHostname(): boolean;

  getRestartCommand(): string;

  getRestartWaitTime(): number;

  generateServiceCheckCommand(): string;

  parseServiceStatus(output: string): ServiceStatus;

  getServiceName(): string;

  getAgentBinaryName(): string;

  getDefaultInstallPath(): string;

  requiresSudo(): boolean;
}

function detectVmPlatform(hostVm: HostVm, osHint?: 'linux' | 'windows' | 'darwin'): PlatformType {
  if (osHint === 'windows') {
    return 'windows';
  }
  if (osHint === 'darwin') {
    return 'darwin';
  }
  return 'linux';
}

function getPlatformEnrollmentStrategy(platform: PlatformType): PlatformEnrollmentStrategy {
  switch (platform) {
    case 'windows':
      return new WindowsEnrollmentStrategy();
    case 'darwin':
      return new MacOSEnrollmentStrategy();
    case 'linux':
      return new UbuntuEnrollmentStrategy();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

class WindowsEnrollmentStrategy implements PlatformEnrollmentStrategy {
  generateDownloadCommand(url: string, destPath: string): string {
    return `
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

Write-Host "Downloading Elastic Agent..."
try {
    Invoke-WebRequest -Uri "${url}" -OutFile "${destPath}" -UseBasicParsing
    if (Test-Path "${destPath}") {
        $size = (Get-Item "${destPath}").Length
        Write-Host "Download complete: $([math]::Round($size/1MB, 2))MB"
    } else {
        throw "Download failed - file not found"
    }
} catch {
    Write-Error "Download failed: $_"
    exit 1
}
    `.trim();
  }

  generateExtractCommand(archivePath: string, destDir: string): string {
    return `
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

Write-Host "Extracting agent archive..."
try {
    Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force
    Write-Host "Extraction complete"
} catch {
    Write-Error "Extraction failed: $_"
    exit 1
}
    `.trim();
  }

  getArchiveExtension(): string {
    return '.zip';
  }

  getDefaultDownloadPath(filename: string): string {
    return `C:\\Users\\Public\\${filename}`;
  }

  generateInstallCommand(agentPath: string, fleetUrl: string, enrollmentToken: string): string {
    const agentDir = agentPath.substring(0, agentPath.lastIndexOf('\\'));
    return `
$ErrorActionPreference = 'Stop'

Write-Host "Installing Elastic Agent..."
try {
    Set-Location "${agentDir}"
    .\\elastic-agent.exe install --url=${fleetUrl} --enrollment-token=${enrollmentToken} --insecure --force --non-interactive
    Write-Host "Installation complete"
} catch {
    Write-Error "Installation failed: $_"
    exit 1
}
    `.trim();
  }

  generateHostnameCommand(hostname: string): string {
    return `
$ErrorActionPreference = 'Stop'

Write-Host "Setting hostname to ${hostname}..."
try {
    Rename-Computer -NewName "${hostname}" -Force
    Write-Host "Hostname changed successfully"
} catch {
    Write-Error "Failed to change hostname: $_"
    exit 1
}
    `.trim();
  }

  requiresRestartAfterHostname(): boolean {
    return true;
  }

  getRestartCommand(): string {
    return `Restart-Computer -Force`;
  }

  getRestartWaitTime(): number {
    return 60000;
  }

  generateServiceCheckCommand(): string {
    return `
$service = Get-Service -Name "Elastic Agent" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "Status: $($service.Status)"
    Write-Host "DisplayName: $($service.DisplayName)"
} else {
    Write-Host "Service not found"
    exit 1
}
    `.trim();
  }

  parseServiceStatus(output: string): ServiceStatus {
    if (output.includes('Status: Running')) {
      return 'running';
    }
    if (output.includes('Status: Stopped')) {
      return 'stopped';
    }
    if (output.includes('Service not found')) {
      return 'unknown';
    }
    return 'unknown';
  }

  getServiceName(): string {
    return 'Elastic Agent';
  }

  getAgentBinaryName(): string {
    return 'elastic-agent.exe';
  }

  getDefaultInstallPath(): string {
    return 'C:\\Program Files\\Elastic\\Agent';
  }

  requiresSudo(): boolean {
    return false;
  }
}

class MacOSEnrollmentStrategy implements PlatformEnrollmentStrategy {
  generateDownloadCommand(url: string, destPath: string): string {
    // Simplified single-line command for UTM compatibility
    // UTM exec doesn't handle multi-line bash scripts well
    return `curl -L -f -o "${destPath}" "${url}" && echo "Download complete: $(ls -lh ${destPath} | awk '{print $5}')" || (echo "Download failed" && exit 1)`;
  }

  generateExtractCommand(archivePath: string, destDir: string): string {
    // Simplified single-line command for UTM compatibility
    return `cd "${destDir}" && tar -xzf "${archivePath}" && echo "Extraction complete" || (echo "Extraction failed" && exit 1)`;
  }

  getArchiveExtension(): string {
    return '.tar.gz';
  }

  getDefaultDownloadPath(filename: string): string {
    // Use user's Downloads folder instead of /tmp (better for macOS)
    return `$HOME/Downloads/${filename}`;
  }

  generateInstallCommand(agentPath: string, fleetUrl: string, enrollmentToken: string): string {
    const agentDir = agentPath.substring(0, agentPath.lastIndexOf('/'));
    // Simplified command chain for UTM compatibility
    return `cd "${agentDir}" && chmod +x ./elastic-agent && sudo ./elastic-agent install --url=${fleetUrl} --enrollment-token=${enrollmentToken} --insecure --force --non-interactive && echo "Installation complete"`;
  }

  generateHostnameCommand(hostname: string): string {
    return `
#!/bin/bash
set -e

echo "Setting hostname to ${hostname}..."
sudo scutil --set ComputerName "${hostname}"
sudo scutil --set LocalHostName "${hostname}"
sudo scutil --set HostName "${hostname}"

current=$(sudo scutil --get HostName)
if [ "$current" = "${hostname}" ]; then
    echo "Hostname changed successfully to: $current"
else
    echo "Warning: Hostname may not have been set correctly"
fi
    `.trim();
  }

  requiresRestartAfterHostname(): boolean {
    return false;
  }

  getRestartCommand(): string {
    return '';
  }

  getRestartWaitTime(): number {
    return 0;
  }

  generateServiceCheckCommand(): string {
    return `
#!/bin/bash
result=$(sudo launchctl list | grep -i elastic-agent || echo "NOT_FOUND")

if [ "$result" = "NOT_FOUND" ]; then
    echo "Service not found"
    exit 1
else
    echo "$result"
fi
    `.trim();
  }

  parseServiceStatus(output: string): ServiceStatus {
    if (output.includes('Service not found')) {
      return 'unknown';
    }
    if (output.includes('elastic-agent')) {
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('elastic-agent')) {
          const parts = line.trim().split(/\s+/);
          if (parts[0] && parts[0] !== '-' && !isNaN(parseInt(parts[0], 10))) {
            return 'running';
          }
        }
      }
      return 'stopped';
    }
    return 'unknown';
  }

  getServiceName(): string {
    return 'elastic-agent';
  }

  getAgentBinaryName(): string {
    return 'elastic-agent';
  }

  getDefaultInstallPath(): string {
    return '/Library/Elastic/Agent';
  }

  requiresSudo(): boolean {
    return true;
  }
}

class UbuntuEnrollmentStrategy implements PlatformEnrollmentStrategy {
  generateDownloadCommand(url: string, destPath: string): string {
    // Simplified single-line command for UTM compatibility
    // Try curl first, fall back to wget
    return `(command -v curl >/dev/null && curl -L -f -o "${destPath}" "${url}") || (command -v wget >/dev/null && wget -O "${destPath}" "${url}") || (echo "Neither curl nor wget available" && exit 1)`;
  }

  generateExtractCommand(archivePath: string, destDir: string): string {
    // Simplified single-line command for UTM compatibility
    return `cd "${destDir}" && tar -xzf "${archivePath}" && echo "Extraction complete" || (echo "Extraction failed" && exit 1)`;
  }

  getArchiveExtension(): string {
    return '.tar.gz';
  }

  getDefaultDownloadPath(filename: string): string {
    return `/tmp/${filename}`;
  }

  generateInstallCommand(agentPath: string, fleetUrl: string, enrollmentToken: string): string {
    const agentDir = agentPath.substring(0, agentPath.lastIndexOf('/'));
    // Simplified command chain for UTM compatibility
    return `cd "${agentDir}" && chmod +x ./elastic-agent && sudo ./elastic-agent install --url=${fleetUrl} --enrollment-token=${enrollmentToken} --insecure --force --non-interactive && echo "Installation complete"`;
  }

  generateHostnameCommand(hostname: string): string {
    return `
#!/bin/bash
set -e

echo "Setting hostname to ${hostname}..."

if command -v hostnamectl >/dev/null 2>&1; then
    sudo hostnamectl set-hostname "${hostname}"
    current=$(hostnamectl --static)
    echo "Hostname set to: $current"
else
    echo "Warning: hostnamectl not found, using fallback method"
    sudo hostname "${hostname}"
    echo "${hostname}" | sudo tee /etc/hostname
    sudo sed -i "s/127.0.1.1.*/127.0.1.1\\t${hostname}/" /etc/hosts
    echo "Hostname set to: ${hostname}"
fi
    `.trim();
  }

  requiresRestartAfterHostname(): boolean {
    return false;
  }

  getRestartCommand(): string {
    return '';
  }

  getRestartWaitTime(): number {
    return 0;
  }

  generateServiceCheckCommand(): string {
    return `
#!/bin/bash

if systemctl list-units --all | grep -q elastic-agent; then
    systemctl status elastic-agent --no-pager || true
else
    echo "Service not found"
    exit 1
fi
    `.trim();
  }

  parseServiceStatus(output: string): ServiceStatus {
    if (output.includes('Active: active (running)')) {
      return 'running';
    }
    if (output.includes('Active: inactive') || output.includes('Active: failed')) {
      return 'stopped';
    }
    if (output.includes('Service not found')) {
      return 'unknown';
    }
    return 'unknown';
  }

  getServiceName(): string {
    return 'elastic-agent';
  }

  getAgentBinaryName(): string {
    return 'elastic-agent';
  }

  getDefaultInstallPath(): string {
    return '/opt/Elastic/Agent';
  }

  requiresSudo(): boolean {
    return true;
  }
}

interface EnrollHostVmWithFleetOptions {
  hostVm: HostVm;
  kbnClient: KbnClient;
  log: ToolingLog;
  /**
   * The Fleet Agent Policy ID that should be used to enroll the agent.
   * If undefined, then a default agent policy wil be created and used to enroll the host
   */
  agentPolicyId?: string;
  /** Agent version. Defaults to the version that the stack is running with */
  version?: string;
  closestVersionMatch?: boolean;
  useAgentCache?: boolean;
  timeoutMs?: number;
  /** Target OS for agent download (defaults to linux) */
  os?: 'linux' | 'windows' | 'darwin';
  /** Target architecture for agent download (defaults to 'auto' which uses process.arch) */
  arch?: 'auto' | 'x86_64' | 'arm64';
  /** Use staging builds instead of snapshot builds (defaults to false) */
  staging?: boolean;
  /**
   * Use direct download optimization (defaults to false for backward compatibility).
   * Note: UTM VMs always use direct download regardless of this setting.
   */
  useDirectDownload?: boolean;
}

async function enrollHostVmWithDirectDownload(
  hostVm: HostVm,
  agentDownloadUrl: string,
  agentFilename: string,
  agentDirName: string,
  fleetServerUrl: string,
  enrollmentToken: string,
  platform: PlatformType,
  log: ToolingLog
): Promise<void> {
  const strategy = getPlatformEnrollmentStrategy(platform);

  log.info(`Starting ${platform} VM enrollment with direct download optimization`);
  log.info(`Agent filename: ${agentFilename}`);
  log.info(`Agent directory: ${agentDirName}`);

  const destPath = strategy.getDefaultDownloadPath(agentFilename);

  log.info(`Step 0/7: Pre-flight checks...`);
  log.info(`Verifying download prerequisites on VM...`);

  if (platform !== 'windows') {
    // Check if curl or wget is available
    try {
      await hostVm.exec('command -v curl || command -v wget', { timeout: 5000 });
      log.info(`Download tool (curl/wget) is available`);
    } catch (err) {
      throw new Error(`Neither curl nor wget found on VM. Install with: sudo apt-get install curl (Ubuntu) or brew install curl (macOS)`);
    }
  }

  log.info(`Step 1/7: Downloading agent to VM...`);
  log.info(`Download URL: ${agentDownloadUrl}`);
  log.info(`Destination: ${destPath}`);
  log.info(`Expected file: ${agentFilename}`);

  const downloadCmd = strategy.generateDownloadCommand(agentDownloadUrl, destPath);
  log.verbose(`Download command:\n${downloadCmd}`);

  // NOTE: UTM's utmctl exec doesn't capture PowerShell stdout/stderr reliably
  // Commands execute successfully, but we can't monitor progress through output
  // So we use a simple time-based wait instead of polling

  log.info(`Starting download command (running in background)...`);
  log.info(`IMPORTANT: If download doesn't start, check:`);
  log.info(`  1. VM has network connectivity (ping google.com)`);
  log.info(`  2. curl/wget is installed (for Linux/macOS)`);
  log.info(`  3. Download URL is accessible from the VM`);

  log.info(`NOTE: UTM does not show download progress or output`);
  log.info(`Download is running in background - please be patient`);
  log.info(`For macOS ARM64, download is ~200MB and may take 3-5 minutes on VM network`);

  const downloadPromise = hostVm.exec(downloadCmd, { timeout: 600000 });

  let downloadFailed = false;
  downloadPromise.catch((err) => {
    log.error(`Download command failed: ${err.message}`);
    log.error(`This likely means:`);
    log.error(`  - VM has no network connectivity`);
    log.error(`  - Download URL is incorrect`);
    log.error(`  - curl command failed`);
    downloadFailed = true;
  });

  // Wait for download to complete
  // Since UTM doesn't show output, we just wait a fixed time
  const downloadWaitTime = 300000; // 5 minutes
  log.info(`Waiting ${downloadWaitTime / 1000} seconds for download to complete...`);
  log.info(`(Download started in background, timing based on typical network speeds)`);

  await new Promise((resolve) => setTimeout(resolve, downloadWaitTime));

  if (downloadFailed) {
    log.error(`Download command failed - cannot proceed`);
    throw new Error(`Download failed to complete`);
  }

  log.info(`Download wait period complete - assuming download finished`);
  log.info(`(UTM limitation: cannot verify file existence, proceeding with extraction)`)

  // Step 2: Extract agent archive
  // UTM doesn't report completion reliably, so we trigger extraction and wait
  log.info(`Step 2/7: Extracting agent archive...`);

  const extractDir = destPath.substring(
    0,
    destPath.lastIndexOf(platform === 'windows' ? '\\' : '/')
  );
  const extractCmd = strategy.generateExtractCommand(destPath, extractDir);

  // Trigger extraction
  log.verbose(`Extraction command: ${extractCmd}`);
  hostVm.exec(extractCmd, { timeout: 180000 }).catch((err) => {
    log.verbose(`Extraction command error (may be normal): ${err.message}`);
  });

  // Wait for extraction to complete
  // Windows Expand-Archive can take time for large files (~200MB)
  const extractWaitTime = platform === 'windows' ? 20000 : 20000; // 20 seconds for all platforms
  log.info(`Waiting ${extractWaitTime / 1000} seconds for extraction to complete...`);
  await new Promise((resolve) => setTimeout(resolve, extractWaitTime));

  log.info(`Extraction wait period complete`);

  // Step 3: Construct agent binary path
  // Since UTM doesn't return stdout properly, we can't use Get-ChildItem to find the file
  // Instead, we construct the expected path based on the agent directory name
  log.info(`Step 3/7: Constructing agent binary path...`);

  const agentBinary = strategy.getAgentBinaryName();
  const agentPathTrimmed =
    platform === 'windows'
      ? `${extractDir}\\${agentDirName}\\${agentBinary}`
      : `${extractDir}/${agentDirName}/${agentBinary}`;

  log.info(`Expected agent path: ${agentPathTrimmed}`);
  log.verbose(
    `Note: UTM doesn't support file verification, so we assume the path is correct after waiting for extraction`
  );

  // Verify agent binary exists before installation
  log.verbose(`Verifying agent binary exists at ${agentPathTrimmed}...`);
  const verifyCmd =
    platform === 'windows'
      ? `Test-Path "${agentPathTrimmed}"`
      : `test -f "${agentPathTrimmed}" && echo "exists" || echo "not found"`;

  try {
    const verifyResult = await hostVm.exec(verifyCmd, { timeout: 5000 });
    log.verbose(`Binary verification result: ${verifyResult.stdout || '(no output)'}`);
  } catch (verifyError) {
    log.warning(`Could not verify binary exists: ${verifyError.message}`);
    log.warning(`Proceeding anyway - binary may exist despite verification failure`);
  }

  log.info(`Step 4/7: Installing Elastic Agent with enrollment...`);
  log.verbose(`Install command: ${strategy.generateInstallCommand(agentPathTrimmed, fleetServerUrl, enrollmentToken)}`);

  const installCmd = strategy.generateInstallCommand(
    agentPathTrimmed,
    fleetServerUrl,
    enrollmentToken
  );

  try {
    const installResult = await hostVm.exec(installCmd, { timeout: 180000 });
    log.verbose(`Install stdout: ${installResult.stdout || '(none)'}`);
    log.verbose(`Install stderr: ${installResult.stderr || '(none)'}`);
    log.info(`Installation complete`);
  } catch (error) {
    log.warning(`Installation reported error: ${error.message}`);
    try {
      const serviceCheck = await hostVm.exec(strategy.generateServiceCheckCommand());
      const status = strategy.parseServiceStatus(serviceCheck.stdout || '');
      if (status === 'unknown') {
        throw error;
      }
      log.info(`Service exists despite error, continuing...`);
    } catch (serviceError) {
      log.error(`Service check also failed: ${serviceError.message}`);
      throw error;
    }
  }

  log.info(`Step 5/7: Configuring hostname...`);
  const hostnameCmd = strategy.generateHostnameCommand(hostVm.name);
  await hostVm.exec(hostnameCmd);
  log.info(`Hostname configured`);

  if (strategy.requiresRestartAfterHostname()) {
    log.info(`Step 6/7: Restarting VM (required for ${platform})...`);
    const restartCmd = strategy.getRestartCommand();

    try {
      await hostVm.exec(restartCmd, { timeout: 10000 });
    } catch (error) {
      log.verbose(`Restart initiated (connection dropped as expected)`);
    }

    const waitTime = strategy.getRestartWaitTime();
    log.info(`Waiting ${waitTime / 1000}s for VM to restart...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await hostVm.exec('echo "VM is responsive"');
        log.info('VM is back online after restart');
        break;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`VM failed to restart after ${maxRetries} attempts`);
        }
        log.verbose(`Waiting for VM to respond (attempt ${i + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } else {
    log.info(`Step 6/7: Restart not required for ${platform}`);
  }

  log.info(`Step 7/7: Verifying ${strategy.getServiceName()} service...`);
  const serviceCmd = strategy.generateServiceCheckCommand();

  try {
    const serviceResult = await hostVm.exec(serviceCmd);
    const serviceStatus = strategy.parseServiceStatus(serviceResult.stdout || '');

    if (serviceStatus === 'running') {
      log.info(`Service is running`);
    } else if (serviceStatus === 'stopped') {
      log.warning(`Service exists but is stopped, attempting to start...`);

      const startCmd =
        platform === 'windows'
          ? `Start-Service -Name "Elastic Agent"`
          : platform === 'darwin'
          ? `sudo launchctl load -w /Library/LaunchDaemons/elastic-agent.plist`
          : `sudo systemctl start elastic-agent`;

      try {
        await hostVm.exec(startCmd);
        log.info(`Service started`);
      } catch (error) {
        log.warning(`Could not start service: ${error.message}`);
      }
    } else {
      log.warning(`Could not verify service status`);
    }
  } catch (error) {
    // Service check command failed (likely service not found)
    log.warning(`Service verification failed: ${error.message}`);
    log.warning(`This may indicate the installation step failed. Check installation logs above.`);
  }

  log.info(`Waiting for service to initialize (10s)...`);
  await new Promise((resolve) => setTimeout(resolve, 10000));

  log.info(`Enrollment process complete`);
  log.info(`If the agent did not enroll successfully, manually check on the VM:`);
  log.info(`  1. SSH/login to the VM`);
  log.info(`  2. Check if download file exists: ls -lah /tmp/*.tar.gz (Linux/macOS)`);
  log.info(`  3. Check if agent extracted: ls -lah /tmp/elastic-agent-*`);
  log.info(`  4. Check agent service: ${platform === 'windows' ? 'Get-Service "Elastic Agent"' : platform === 'darwin' ? 'sudo launchctl list | grep elastic' : 'systemctl status elastic-agent'}`);
  log.info(`  5. Check network: ping google.com`);
}

/**
 * Installs the Elastic agent on the provided Host VM and enrolls with it Fleet.
 *
 * NOTE: this method assumes that Fleet-Server is already setup and running.
 *
 * @param hostVm
 * @param kbnClient
 * @param log
 * @param agentPolicyId
 * @param version
 * @param closestVersionMatch
 * @param useAgentCache
 * @param timeoutMs
 */
export const enrollHostVmWithFleet = async ({
  hostVm,
  kbnClient,
  log,
  agentPolicyId,
  version,
  closestVersionMatch = true,
  useAgentCache = true,
  timeoutMs = 240000,
  os = 'linux',
  arch = 'auto',
  staging = false,
}: EnrollHostVmWithFleetOptions): Promise<Agent> => {
  log.info(`Enrolling host VM [${hostVm.name}] with Fleet (OS: ${os}, Arch: ${arch})`);

  if (!(await isFleetServerRunning(kbnClient))) {
    throw new Error(`Fleet server does not seem to be running on this instance of kibana!`);
  }

  const agentVersion = version || (await getAgentVersionMatchingCurrentStack(kbnClient));
  const agentUrlInfo = await getAgentDownloadUrl(
    agentVersion,
    closestVersionMatch,
    log,
    os,
    arch,
    staging
  );

  const agentDownload: DownloadAndStoreAgentResponse = useAgentCache
    ? await downloadAndStoreAgent(agentUrlInfo.url, agentUrlInfo.fileName)
    : { url: agentUrlInfo.url, directory: '', filename: agentUrlInfo.fileName, fullFilePath: '' };

  const policyId = agentPolicyId || (await getOrCreateDefaultAgentPolicy({ kbnClient, log })).id;
  const [fleetServerUrl, enrollmentToken] = await Promise.all([
    fetchFleetServerUrl(kbnClient),
    fetchAgentPolicyEnrollmentKey(kbnClient, policyId),
  ]);

  // Always use direct download for UTM VMs (faster than upload via QEMU guest agent)
  if (hostVm.type === 'utm') {
    log.info(`Using direct download optimization for ${os} UTM VM`);

    const platform = detectVmPlatform(hostVm, os);
    await enrollHostVmWithDirectDownload(
      hostVm,
      agentDownload.url,
      agentDownload.filename,
      agentUrlInfo.dirName,
      fleetServerUrl,
      enrollmentToken,
      platform,
      log
    );

    log.info(`Checking Fleet for agent enrollment (timeout: ${timeoutMs / 1000}s)...`);
    return waitForHostToEnroll(kbnClient, log, hostVm.name, timeoutMs);
  }

  log.info(`Installing Elastic Agent`);

  // For multipass, we need to place the Agent archive in the VM - either mounting local cache
  // directory or downloading it directly from inside of the VM.
  // For Vagrant, the archive is already in the VM - it was done during VM creation.
  // For UTM: Direct download is attempted first (faster), with fallback to upload if needed.
  if (hostVm.type === 'multipass') {
    if (useAgentCache) {
      const hostVmDownloadsDir = '/home/ubuntu/_agent_downloads';

      log.debug(
        `Mounting agents download cache directory [${agentDownload.directory}] to Host VM at [${hostVmDownloadsDir}]`
      );
      const downloadsMount = await hostVm.mount(agentDownload.directory, hostVmDownloadsDir);

      log.debug(`Extracting download archive on host VM`);
      await hostVm.exec(`tar -zxf ${downloadsMount.hostDir}/${agentDownload.filename}`);

      await downloadsMount.unmount();
    } else {
      log.debug(`Downloading Elastic Agent to host VM`);
      await hostVm.exec(`curl -L ${agentDownload.url} -o ${agentDownload.filename}`);

      log.debug(`Extracting download archive on host VM`);
      await hostVm.exec(`tar -zxf ${agentDownload.filename}`);
      // Keep ZIP file for debugging - don't delete
      // await hostVm.exec(`rm -f ${agentDownload.filename}`);
    }
  }

  // Build OS-specific enrollment command
  let agentEnrollCommand: string;
  let agentExePath: string | undefined;

  if (os === 'windows') {
    // Windows: cd into the extracted directory and run elastic-agent.exe
    // This matches the Kibana Fleet UI installation instructions
    const agentDir = `C:\\Users\\Public\\${agentUrlInfo.dirName}`;
    agentExePath = `${agentDir}\\elastic-agent.exe`;
    log.info(`Agent directory: ${agentDir}`);
    log.info(`Agent executable: ${agentExePath}`);

    // Build install command - cd into directory first, then run with relative path
    // Use --url= and --enrollment-token= with equals signs (Kibana style)
    agentEnrollCommand = `cd "${agentDir}" ; .\\elastic-agent.exe install --url=${fleetServerUrl} --enrollment-token=${enrollmentToken} --insecure --force --non-interactive`;
  } else {
    // Linux/macOS: Use bash, forward slashes, sudo
    const agentPath =
      hostVm.type === 'multipass'
        ? `./${agentUrlInfo.dirName}/elastic-agent`
        : `/tmp/${agentUrlInfo.dirName}/elastic-agent`;
    agentEnrollCommand = `sudo ${agentPath} install --insecure --force --non-interactive --url ${fleetServerUrl} --enrollment-token ${enrollmentToken}`;
  }

  // For Windows, verify directory exists first before running install
  if (os === 'windows') {
    const agentDir = `C:\\Users\\Public\\${agentUrlInfo.dirName}`;

    const dirCheck = await hostVm.exec(`Get-ChildItem "${agentDir}" -ErrorAction Stop`);
    log.verbose(`Directory check exit code: ${dirCheck.exitCode}`);

    if (dirCheck.exitCode !== 0) {
      log.error(`Agent directory not found: ${agentDir}`);
      throw new Error(`Agent directory does not exist at ${agentDir}. Extraction may have failed.`);
    }

    log.verbose(`Agent directory verified: ${agentDir}`);
  }

  // Execute installation and capture output
  try {
    let installResult;

    // For Windows, follow Elastic's official installation pattern
    if (os === 'windows') {
      const agentDir = `C:\\Users\\Public\\${agentUrlInfo.dirName}`;

      // Follow the exact pattern from Elastic's documentation:
      // cd elastic-agent-X.X.X-windows-arm64
      // .\elastic-agent.exe install --url=... --enrollment-token=...
      // IMPORTANT: Add --non-interactive to prevent "Do you want to continue? [Y/n]:" prompt
      const installCommand = `
cd "${agentDir}"
.\\elastic-agent.exe install --url=${fleetServerUrl} --enrollment-token=${enrollmentToken} --insecure --force --non-interactive
      `.trim();

      log.info(`Installing Elastic Agent...`);

      try {
        installResult = await hostVm.exec(installCommand);

        log.verbose(`Exit code: ${installResult.exitCode}`);
        if (installResult.stdout) {
          log.verbose(`STDOUT: ${installResult.stdout}`);
        }
        if (installResult.stderr) {
          log.verbose(`STDERR: ${installResult.stderr}`);
        }
      } catch (e) {
        log.error(`Agent installation failed: ${e.message}`);
        if (e.stdout) {
          log.verbose(`STDOUT: ${e.stdout}`);
        }
        if (e.stderr) {
          log.verbose(`STDERR: ${e.stderr}`);
        }
        throw e;
      }

      // NOTE: Service verification through UTM is unreliable (PowerShell output doesn't work well)
      // Instead, we'll rely on the Fleet enrollment check below which is the real verification
      log.info(`✓ Installation completed, waiting for service to start...`);

      // Give the agent a moment to start enrolling (10 seconds)
      for (let i = 1; i <= 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (i % 3 === 0) {
          // Show progress every 3 seconds
          log.info(`  Service starting... ${i * 10}%`);
        }
      }
    } else {
      installResult = await hostVm.exec(agentEnrollCommand);
    }

    // Note: PowerShell through utmctl doesn't return stdout reliably, so we can't show output
    // The exit code is the main indicator of success/failure
    log.verbose(`Install exit code: ${installResult.exitCode}`);

    if (installResult.exitCode !== 0) {
      log.error(`Agent installation failed with exit code ${installResult.exitCode}`);
      throw new Error(`Agent installation failed with exit code ${installResult.exitCode}`);
    }

    // IMPORTANT: Give the agent service time to start and begin enrollment
    // The install command returns immediately, but service startup and enrollment
    // happen asynchronously. Wait a bit before checking Fleet.
    if (os !== 'windows') {
      log.info(`Waiting for service to start...`);
      for (let i = 1; i <= 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (i % 3 === 0) {
          log.info(`  Service starting... ${i * 10}%`);
        }
      }
    }

    // Verify the service was actually created on Windows
    if (os === 'windows') {
      const serviceCheck = await hostVm.exec(
        `Get-Service -Name "Elastic Agent" -ErrorAction SilentlyContinue`
      );

      if (serviceCheck.exitCode === 0) {
        log.verbose(`Elastic Agent service exists`);
        const statusCheck = await hostVm.exec(`(Get-Service -Name "Elastic Agent").Status`);
        if (statusCheck.stdout) {
          log.verbose(`Service status: ${statusCheck.stdout.trim()}`);
        }
      } else {
        log.warning(`⚠️  Elastic Agent service not found - installation may have failed`);
      }
    }

    log.info(`Checking Fleet for agent enrollment (timeout: ${timeoutMs / 1000}s)...`);
  } catch (e) {
    log.error(`Agent installation failed: ${e.message}`);
    throw e;
  }

  // Wait for Fleet to see the enrolled agent
  return waitForHostToEnroll(kbnClient, log, hostVm.name, timeoutMs);
};

interface CreateAgentPolicyOptions {
  kbnClient: KbnClient;
  policy?: CreateAgentPolicyRequest['body'];
}

/**
 * Create a new Agent Policy in fleet
 * @param kbnClient
 * @param log
 * @param policy
 */
export const createAgentPolicy = async ({
  kbnClient,
  policy,
}: CreateAgentPolicyOptions): Promise<AgentPolicy> => {
  const body: CreateAgentPolicyRequest['body'] = policy ?? {
    name: randomAgentPolicyName(),
    description: `Policy created by security solution tooling: ${__filename}`,
    namespace: (await fetchActiveSpace(kbnClient)).id,
    monitoring_enabled: ['logs', 'metrics'],
  };

  return kbnClient
    .request<CreateAgentPolicyResponse>({
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      method: 'POST',
      body,
    })
    .then((response) => response.data.item)
    .catch(catchAxiosErrorFormatAndThrow);
};

interface GetOrCreateDefaultAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  policyName?: string;
  overrides?: Partial<Omit<CreateAgentPolicyRequest['body'], 'name'>>;
}

/**
 * Creates a default Fleet Agent policy (if it does not yet exist) for testing. If
 * policy already exists, then it will be reused. It uses the policy name to find an
 * existing match.
 * @param kbnClient
 * @param log
 * @param policyName
 * @param overrides
 */
export const getOrCreateDefaultAgentPolicy = async ({
  kbnClient,
  log,
  policyName = DEFAULT_AGENT_POLICY_NAME,
  overrides = {},
}: GetOrCreateDefaultAgentPolicyOptions): Promise<AgentPolicy> => {
  const existingPolicy = await fetchAgentPolicyList(kbnClient, {
    kuery: `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.name: "${policyName}"`,
    withAgentCount: true,
  });

  if (existingPolicy.items[0]) {
    log.info(`Re-using existing Fleet test agent policy: [${existingPolicy.items[0].name}]`);
    log.verbose(existingPolicy.items[0]);

    return existingPolicy.items[0];
  }

  log.info(`Creating default test/dev Fleet agent policy with name: [${policyName}]`);

  const spaceId = (await fetchActiveSpace(kbnClient)).id;
  const newAgentPolicy = await createAgentPolicy({
    kbnClient,
    policy: {
      name: policyName,
      description: `Policy created by security solution tooling: ${__filename}`,
      namespace: spaceId.replace(/-/g, '_'),
      monitoring_enabled: ['logs', 'metrics'],
      ...overrides,
    },
  });

  log.verbose(newAgentPolicy);

  return newAgentPolicy;
};

/**
 * Creates a Fleet Integration Policy using the API
 * @param kbnClient
 * @param policyData
 */
export const createIntegrationPolicy = async (
  kbnClient: KbnClient,
  policyData: CreatePackagePolicyRequest['body']
): Promise<PackagePolicy> => {
  return kbnClient
    .request<CreatePackagePolicyResponse>({
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      method: 'POST',
      body: policyData,
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    })
    .then((response) => response.data.item)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Gets package information from fleet
 * @param kbnClient
 * @param packageName
 */
export const fetchPackageInfo = async (
  kbnClient: KbnClient,
  packageName: string
): Promise<GetInfoResponse['item']> => {
  return kbnClient
    .request<GetInfoResponse>({
      path: epmRouteService.getInfoPath(packageName),
      headers: { 'Elastic-Api-Version': '2023-10-31' },
      method: 'GET',
    })
    .then((response) => response.data.item)
    .catch(catchAxiosErrorFormatAndThrow);
};

interface AddMicrosoftDefenderForEndpointToAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  integrationPolicyName?: string;
  /** Set to `true` if wanting to add the integration to the agent policy even if that agent policy already has one  */
  force?: boolean;
}

export const addMicrosoftDefenderForEndpointIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  tenantId,
  clientId,
  clientSecret,
  integrationPolicyName = `MS Defender for Endpoint policy (${Math.random()
    .toString()
    .substring(2, 6)})`,
  force,
}: AddMicrosoftDefenderForEndpointToAgentPolicyOptions): Promise<PackagePolicy> => {
  const msPackageName = 'microsoft_defender_endpoint';

  // If `force` is `false and agent policy already has a MS integration, exit here
  if (!force) {
    log.debug(
      `Checking to see if agent policy [${agentPolicyId}] already includes a Microsoft Defender for Endpoint integration policy`
    );

    const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);

    log.verbose(agentPolicy);

    const integrationPolicies = agentPolicy.package_policies ?? [];

    for (const integrationPolicy of integrationPolicies) {
      if (integrationPolicy.package?.name === msPackageName) {
        log.debug(
          `Returning existing Microsoft Defender for Endpoint Integration Policy included in agent policy [${agentPolicyId}]`
        );
        return integrationPolicy;
      }
    }
  }

  const {
    version: packageVersion,
    name: packageName,
    title: packageTitle,
  } = await fetchPackageInfo(kbnClient, msPackageName);

  log.debug(
    `Creating new Microsoft Defender for Endpoint integration policy [package v${packageVersion}] and adding it to agent policy [${agentPolicyId}]`
  );

  return createIntegrationPolicy(kbnClient, {
    name: integrationPolicyName,
    description: `Created by script: ${__filename}`,
    policy_ids: [agentPolicyId],
    enabled: true,
    inputs: [
      {
        type: 'httpjson',
        policy_template: 'microsoft_defender_endpoint',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'microsoft_defender_endpoint.log',
            },
            vars: {
              client_id: {
                type: 'text',
                value: clientId,
              },
              enable_request_tracer: {
                value: false,
                type: 'bool',
              },
              client_secret: {
                type: 'password',
                value: clientSecret,
              },
              tenant_id: {
                type: 'text',
                value: tenantId,
              },
              initial_interval: {
                value: '5m',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              scopes: {
                value: [],
                type: 'text',
              },
              azure_resource: {
                value: 'https://api.securitycenter.windows.com/',
                type: 'text',
              },
              proxy_url: {
                type: 'text',
              },
              login_url: {
                value: 'https://login.microsoftonline.com/',
                type: 'text',
              },
              token_url: {
                value: 'oauth2/token',
                type: 'text',
              },
              request_url: {
                value: 'https://api.securitycenter.windows.com/api/alerts',
                type: 'text',
              },
              tags: {
                value: ['microsoft-defender-endpoint', 'forwarded'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
        ],
      },
      {
        type: 'logfile',
        policy_template: 'microsoft_defender_endpoint',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'microsoft_defender_endpoint.log',
            },
            vars: {
              paths: {
                value: [],
                type: 'text',
              },
              tags: {
                value: ['microsoft-defender-endpoint', 'forwarded'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
        ],
      },
      {
        type: 'cel',
        policy_template: 'microsoft_defender_endpoint',
        enabled: false,
        streams: [
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'microsoft_defender_endpoint.machine',
            },
            vars: {
              interval: {
                value: '24h',
                type: 'text',
              },
              batch_size: {
                value: 1000,
                type: 'text',
              },
              http_client_timeout: {
                value: '30s',
                type: 'text',
              },
              enable_request_tracer: {
                value: false,
                type: 'bool',
              },
              tags: {
                value: ['forwarded', 'microsoft_defender_endpoint-machine'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              preserve_duplicate_custom_fields: {
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'microsoft_defender_endpoint.machine_action',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              batch_size: {
                value: 1000,
                type: 'text',
              },
              http_client_timeout: {
                value: '30s',
                type: 'text',
              },
              enable_request_tracer: {
                value: false,
                type: 'bool',
              },
              tags: {
                value: ['forwarded', 'microsoft_defender_endpoint-machine_action'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              preserve_duplicate_custom_fields: {
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'microsoft_defender_endpoint.vulnerability',
            },
            vars: {
              interval: {
                value: '4h',
                type: 'text',
              },
              batch_size: {
                value: 8000,
                type: 'integer',
              },
              affected_machines_only: {
                value: true,
                type: 'bool',
              },
              enable_request_tracer: {
                value: false,
                type: 'bool',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              tags: {
                value: ['forwarded', 'microsoft_defender_endpoint-vulnerability'],
                type: 'text',
              },
              http_client_timeout: {
                value: '30s',
                type: 'text',
              },
              preserve_duplicate_custom_fields: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
        ],
        vars: {
          client_id: {
            type: 'text',
          },
          client_secret: {
            type: 'password',
          },
          login_url: {
            value: 'https://login.microsoftonline.com',
            type: 'text',
          },
          url: {
            value: 'https://api.security.microsoft.com',
            type: 'text',
          },
          tenant_id: {
            type: 'text',
          },
          token_scopes: {
            value: ['https://securitycenter.onmicrosoft.com/windowsatpservice/.default'],
            type: 'text',
          },
          proxy_url: {
            type: 'text',
          },
          ssl: {
            value:
              '#certificate_authorities:\n#  - |\n#    -----BEGIN CERTIFICATE-----\n#    MIIDCjCCAfKgAwIBAgITJ706Mu2wJlKckpIvkWxEHvEyijANBgkqhkiG9w0BAQsF\n#    ADAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwIBcNMTkwNzIyMTkyOTA0WhgPMjExOTA2\n#    MjgxOTI5MDRaMBQxEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEB\n#    BQADggEPADCCAQoCggEBANce58Y/JykI58iyOXpxGfw0/gMvF0hUQAcUrSMxEO6n\n#    fZRA49b4OV4SwWmA3395uL2eB2NB8y8qdQ9muXUdPBWE4l9rMZ6gmfu90N5B5uEl\n#    94NcfBfYOKi1fJQ9i7WKhTjlRkMCgBkWPkUokvBZFRt8RtF7zI77BSEorHGQCk9t\n#    /D7BS0GJyfVEhftbWcFEAG3VRcoMhF7kUzYwp+qESoriFRYLeDWv68ZOvG7eoWnP\n#    PsvZStEVEimjvK5NSESEQa9xWyJOmlOKXhkdymtcUd/nXnx6UTCFgnkgzSdTWV41\n#    CI6B6aJ9svCTI2QuoIq2HxX/ix7OvW1huVmcyHVxyUECAwEAAaNTMFEwHQYDVR0O\n#    BBYEFPwN1OceFGm9v6ux8G+DZ3TUDYxqMB8GA1UdIwQYMBaAFPwN1OceFGm9v6ux\n#    8G+DZ3TUDYxqMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAG5D\n#    874A4YI7YUwOVsVAdbWtgp1d0zKcPRR+r2OdSbTAV5/gcS3jgBJ3i1BN34JuDVFw\n#    3DeJSYT3nxy2Y56lLnxDeF8CUTUtVQx3CuGkRg1ouGAHpO/6OqOhwLLorEmxi7tA\n#    H2O8mtT0poX5AnOAhzVy7QW0D/k4WaoLyckM5hUa6RtvgvLxOwA0U+VGurCDoctu\n#    8F4QOgTAWyh8EZIwaKCliFRSynDpv3JTUwtfZkxo6K6nce1RhCWFAsMvDZL8Dgc0\n#    yvgJ38BRsFOtkRuAGSf6ZUwTO8JJRRIFnpUzXflAnGivK9M13D5GEQMmIl6U9Pvk\n#    sxSmbIUfc2SGJGCJD4I=\n#    -----END CERTIFICATE-----\n',
            type: 'yaml',
          },
        },
      },
    ],
    package: {
      name: packageName,
      title: packageTitle,
      version: packageVersion,
    },
  });
};

interface AddSentinelOneIntegrationToAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  /** The URL to the SentinelOne Management console */
  consoleUrl: string;
  /** The SentinelOne API token */
  apiToken: string;
  integrationPolicyName?: string;
  /** Set to `true` if wanting to add the integration to the agent policy even if that agent policy already has one  */
  force?: boolean;
}

/**
 * Creates a Fleet SentinelOne Integration Policy and adds it to the provided Fleet Agent Policy.
 *
 * NOTE: by default, a new SentinelOne integration policy will only be created if one is not already
 * part of the provided Agent policy. Use `force` if wanting to still add it.
 *
 * @param kbnClient
 * @param log
 * @param agentPolicyId
 * @param consoleUrl
 * @param apiToken
 * @param integrationPolicyName
 * @param force
 */
export const addSentinelOneIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  consoleUrl,
  apiToken,
  integrationPolicyName = `SentinelOne policy (${Math.random().toString().substring(2, 6)})`,
  force = false,
}: AddSentinelOneIntegrationToAgentPolicyOptions): Promise<PackagePolicy> => {
  // If `force` is `false and agent policy already has a SentinelOne integration, exit here
  if (!force) {
    log.debug(
      `Checking to see if agent policy [] already includes a SentinelOne integration policy`
    );

    const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);

    log.verbose(agentPolicy);

    const integrationPolicies = agentPolicy.package_policies ?? [];

    for (const integrationPolicy of integrationPolicies) {
      if (integrationPolicy.package?.name === 'sentinel_one') {
        log.debug(
          `Returning existing SentinelOne Integration Policy included in agent policy [${agentPolicyId}]`
        );
        return integrationPolicy;
      }
    }
  }

  const {
    version: packageVersion,
    name: packageName,
    title: packageTitle,
  } = await fetchPackageInfo(kbnClient, 'sentinel_one');

  log.debug(
    `Creating new SentinelOne integration policy [package v${packageVersion}] and adding it to agent policy [${agentPolicyId}]`
  );

  return createIntegrationPolicy(kbnClient, {
    name: integrationPolicyName,
    description: `Created by script: ${__filename}`,
    policy_id: agentPolicyId,
    policy_ids: [agentPolicyId],
    enabled: true,
    inputs: [
      {
        type: 'httpjson',
        policy_template: 'sentinel_one',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.activity',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-activity'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.agent',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-agent'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.alert',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-alert'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.group',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-group'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'sentinel_one.threat',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'sentinel_one-threat'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
        ],
        vars: {
          url: {
            type: 'text',
            value: consoleUrl,
          },
          enable_request_tracer: {
            type: 'bool',
          },
          api_token: {
            type: 'password',
            value: apiToken,
          },
          proxy_url: {
            type: 'text',
          },
          ssl: {
            value:
              '#certificate_authorities:\n#  - |\n#    -----BEGIN CERTIFICATE-----\n#    MIIDCjCCAfKgAwIBAgITJ706Mu2wJlKckpIvkWxEHvEyijANBgkqhkiG9w0BAQsF\n#    ADAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwIBcNMTkwNzIyMTkyOTA0WhgPMjExOTA2\n#    MjgxOTI5MDRaMBQxEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEB\n#    BQADggEPADCCAQoCggEBANce58Y/JykI58iyOXpxGfw0/gMvF0hUQAcUrSMxEO6n\n#    fZRA49b4OV4SwWmA3395uL2eB2NB8y8qdQ9muXUdPBWE4l9rMZ6gmfu90N5B5uEl\n#    94NcfBfYOKi1fJQ9i7WKhTjlRkMCgBkWPkUokvBZFRt8RtF7zI77BSEorHGQCk9t\n#    /D7BS0GJyfVEhftbWcFEAG3VRcoMhF7kUzYwp+qESoriFRYLeDWv68ZOvG7eoWnP\n#    PsvZStEVEimjvK5NSESEQa9xWyJOmlOKXhkdymtcUd/nXnx6UTCFgnkgzSdTWV41\n#    CI6B6aJ9svCTI2QuoIq2HxX/ix7OvW1huVmcyHVxyUECAwEAAaNTMFEwHQYDVR0O\n#    BBYEFPwN1OceFGm9v6ux8G+DZ3TUDYxqMB8GA1UdIwQYMBaAFPwN1OceFGm9v6ux\n#    8G+DZ3TUDYxqMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAG5D\n#    874A4YI7YUwOVsVAdbWtgp1d0zKcPRR+r2OdSbTAV5/gcS3jgBJ3i1BN34JuDVFw\n#    3DeJSYT3nxy2Y56lLnxDeF8CUTUtVQx3CuGkRg1ouGAHpO/6OqOhwLLorEmxi7tA\n#    H2O8mtT0poX5AnOAhzVy7QW0D/k4WaoLyckM5hUa6RtvgvLxOwA0U+VGurCDoctu\n#    8F4QOgTAWyh8EZIwaKCliFRSynDpv3JTUwtfZkxo6K6nce1RhCWFAsMvDZL8Dgc0\n#    yvgJ38BRsFOtkRuAGSf6ZUwTO8JJRRIFnpUzXflAnGivK9M13D5GEQMmIl6U9Pvk\n#    sxSmbIUfc2SGJGCJD4I=\n#    -----END CERTIFICATE-----\n',
            type: 'yaml',
          },
        },
      },
    ],
    package: {
      name: packageName,
      title: packageTitle,
      version: packageVersion,
    },
  });
};

interface AddEndpointIntegrationToAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  name?: string;
}

/**
 * Adds Endpoint integration to the Fleet agent policy provided on input
 * @param kbnClient
 * @param log
 * @param agentPolicyId
 * @param name
 */
export const addEndpointIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  name = `${CURRENT_USERNAME} test policy`,
}: AddEndpointIntegrationToAgentPolicyOptions): Promise<PackagePolicy> => {
  const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);

  log.verbose('Agent policy', agentPolicy);

  const integrationPolicies = agentPolicy.package_policies ?? [];

  for (const integrationPolicy of integrationPolicies) {
    if (integrationPolicy.package?.name === 'endpoint') {
      log.debug(
        `Returning existing Endpoint Integration Policy included in agent policy [${agentPolicyId}]`
      );
      log.verbose(integrationPolicy);

      return integrationPolicy;
    }
  }

  const {
    version: packageVersion,
    name: packageName,
    title: packageTitle,
  } = await getEndpointPackageInfo(kbnClient);

  const newIntegrationPolicy = await createIntegrationPolicy(kbnClient, {
    name,
    description: `Created by: ${__filename}`,
    policy_id: agentPolicyId,
    policy_ids: [agentPolicyId],
    enabled: true,
    inputs: [
      {
        enabled: true,
        streams: [],
        type: 'ENDPOINT_INTEGRATION_CONFIG',
        config: {
          _config: {
            value: {
              type: 'endpoint',
              endpointConfig: {
                preset: 'EDRComplete',
              },
            },
          },
        },
      },
    ],
    package: {
      name: packageName,
      title: packageTitle,
      version: packageVersion,
    },
  });

  log.verbose(
    `New Endpoint integration policy created: Name[${name}], Id[${newIntegrationPolicy.id}]`
  );
  log.debug(newIntegrationPolicy);

  return newIntegrationPolicy;
};

type CopyAgentPolicyOptions = Partial<CopyAgentPolicyRequest['body']> & {
  kbnClient: KbnClient;
  agentPolicyId: string;
};

/**
 * Copy (clone) a Fleet Agent Policy
 * @param kbnClient
 * @param agentPolicyId
 * @param name
 * @param description
 */
export const copyAgentPolicy = async ({
  kbnClient,
  agentPolicyId,
  name = randomAgentPolicyName(),
  description,
}: CopyAgentPolicyOptions) => {
  return kbnClient
    .request<CopyAgentPolicyResponse>({
      path: agentPolicyRouteService.getCopyPath(agentPolicyId),
      headers: {
        'elastic-api-version': API_VERSIONS.public.v1,
      },
      method: 'POST',
      body: {
        name,
        description,
      },
    })
    .then((response) => response.data.item)
    .catch(catchAxiosErrorFormatAndThrow);
};

/**
 * Calls the fleet setup API to ensure fleet configured with default settings
 * @param kbnClient
 * @param log
 */
export const ensureFleetSetup = memoize(
  async (kbnClient: KbnClient, log: ToolingLog): Promise<PostFleetSetupResponse> => {
    const setupResponse = await kbnClient
      .request<PostFleetSetupResponse>({
        path: SETUP_API_ROUTE,
        headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
        method: 'POST',
      })
      .catch(catchAxiosErrorFormatAndThrow);

    if (!setupResponse.data.isInitialized) {
      log.verbose(`Fleet setup response:`, setupResponse);
      throw new Error(`Call to initialize Fleet [${SETUP_API_ROUTE}] failed`);
    }

    return setupResponse.data;
  }
);

/**
 * Fetches a list of Endpoint Integration policies from fleet
 * @param kbnClient
 * @param kuery
 * @param options
 */
export const fetchEndpointIntegrationPolicyList = async (
  kbnClient: KbnClient,
  { kuery, ...options }: GetPackagePoliciesRequest['query'] = {}
) => {
  const endpointPackageMatchValue = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`;

  return fetchIntegrationPolicyList(kbnClient, {
    ...options,
    kuery: kuery ? `${kuery} AND ${endpointPackageMatchValue}` : endpointPackageMatchValue,
  });
};

/**
 * Retrieves all Endpoint Integration policy IDs - but only up to 10k
 * @param kbnClient
 */
export const fetchAllEndpointIntegrationPolicyListIds = async (
  kbnClient: KbnClient
): Promise<string[]> => {
  const perPage = 1000;
  const policyIds = [];
  let hasMoreData = true;

  do {
    const result = await fetchEndpointIntegrationPolicyList(kbnClient, { perPage });
    policyIds.push(...result.items.map((policy) => policy.id));

    // If no more results or the next page of content goes over 10k, then end loop here.
    if (!result.items.length || policyIds.length + perPage < 10000) {
      hasMoreData = false;
    }
  } while (hasMoreData);

  return policyIds;
};

/**
 * Calls the Fleet internal API to enable space awareness
 * @param kbnClient
 */
export const enableFleetSpaceAwareness = memoize(async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient
    .request({
      path: '/internal/fleet/enable_space_awareness',
      headers: { 'Elastic-Api-Version': '1' },
      method: 'POST',
    })
    .catch(catchAxiosErrorFormatAndThrow);
});

/**
 * Fetches a single integratino policy by id
 * @param kbnClient
 * @param policyId
 */
export const fetchIntegrationPolicy = async (
  kbnClient: KbnClient,
  policyId: string
): Promise<GetOnePackagePolicyResponse['item']> => {
  return kbnClient
    .request<GetOnePackagePolicyResponse>({
      path: packagePolicyRouteService.getInfoPath(policyId),
      method: 'GET',
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data.item);
};

/**
 * Update a fleet integration policy (aka: package policy)
 * @param kbnClient
 */
export const updateIntegrationPolicy = async (
  kbnClient: KbnClient,
  /** The Integration policy id */
  id: string,
  policyData: Partial<CreatePackagePolicyRequest['body']>,
  /** If set to `true`, then `policyData` can be a partial set of updates and not the full policy data */
  patch: boolean = false
): Promise<UpdatePackagePolicyResponse['item']> => {
  let fullPolicyData = policyData;

  if (patch) {
    const currentSavedPolicy = await fetchIntegrationPolicy(kbnClient, id);
    fullPolicyData = getPolicyDataForUpdate(currentSavedPolicy as PolicyData);
    Object.assign(fullPolicyData, policyData);
  }

  return kbnClient
    .request<UpdatePackagePolicyResponse>({
      path: packagePolicyRouteService.getUpdatePath(id),
      method: 'PUT',
      body: fullPolicyData,
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data.item);
};

/**
 * Updates a Fleet agent policy
 * @param kbnClient
 * @param id
 * @param policyData
 * @param patch
 */
export const updateAgentPolicy = async (
  kbnClient: KbnClient,
  /** Fleet Agent Policy ID */
  id: string,
  /** The updated agent policy data. Could be a `partial` update if `patch` arguments below is true */
  policyData: Partial<UpdateAgentPolicyRequest['body']>,
  /**
   * If set to `true`, the `policyData` provided on input will first be merged with the latest version
   * of the policy and then the updated applied
   */
  patch: boolean = false
): Promise<UpdateAgentPolicyResponse['item']> => {
  let fullPolicyData = policyData;

  if (patch) {
    const currentSavedPolicy = await fetchAgentPolicy(kbnClient, id);

    fullPolicyData = getAgentPolicyDataForUpdate(currentSavedPolicy);
    delete fullPolicyData.id;
    Object.assign(fullPolicyData, policyData);
  }

  return kbnClient
    .request<UpdateAgentPolicyResponse>({
      path: agentPolicyRouteService.getUpdatePath(id),
      method: 'PUT',
      body: fullPolicyData,
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data.item);
};

/**
 * Sets the log level on a Fleet agent and waits a bit of time to allow it for to
 * complete (but does not error if it does not complete)
 *
 * @param kbnClient
 * @param agentId
 * @param logLevel
 * @param log
 */
export const setAgentLoggingLevel = async (
  kbnClient: KbnClient,
  agentId: string,
  logLevel: 'debug' | 'info' | 'warning' | 'error',
  log: ToolingLog = createToolingLogger()
): Promise<PostNewAgentActionResponse> => {
  log.debug(`Setting fleet agent [${agentId}] logging level to [${logLevel}]`);

  const response = await kbnClient
    .request<PostNewAgentActionResponse>({
      method: 'POST',
      path: `/api/fleet/agents/${agentId}/actions`,
      body: { action: { type: 'SETTINGS', data: { log_level: logLevel } } },
      headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
    })
    .then((res) => res.data);

  // Wait to see if the action completes, but don't `throw` if it does not
  await waitForFleetAgentActionToComplete(kbnClient, response.item.id)
    .then(() => {
      log.debug(`Fleet action to set agent [${agentId}] logging level to [${logLevel}] completed!`);
    })
    .catch((err) => {
      log.debug(err.message);
    });

  return response;
};

/**
 * Retrieve fleet agent action statuses
 * @param kbnClient
 */
export const fetchFleetAgentActionStatus = async (
  kbnClient: KbnClient
): Promise<GetActionStatusResponse> => {
  return kbnClient
    .request<GetActionStatusResponse>({
      method: 'GET',
      path: agentRouteService.getActionStatusPath(),
      query: { perPage: 1000 },
      headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
    })
    .then((response) => response.data);
};

/**
 * Check and wait until a Fleet Agent action is complete.
 * @param kbnClient
 * @param actionId
 * @param timeout
 *
 * @throws
 */
export const waitForFleetAgentActionToComplete = async (
  kbnClient: KbnClient,
  actionId: string,
  timeout: number = 20_000
): Promise<void> => {
  await pRetry(
    async (attempts) => {
      const { items: actionList } = await fetchFleetAgentActionStatus(kbnClient);
      const actionInfo = actionList.find((action) => action.actionId === actionId);

      if (!actionInfo) {
        throw new Error(
          `Fleet Agent action id [${actionId}] was not found in list of actions retrieved from fleet!`
        );
      }

      if (actionInfo.status === 'IN_PROGRESS') {
        throw new Error(
          `Fleet agent action id [${actionId}] remains in progress after [${attempts}] attempts to check its status`
        );
      }
    },
    { maxTimeout: 2_000, maxRetryTime: timeout }
  );
};

/**
 * Installs an Integration in fleet, which ensures that all of its assets are configured
 * @param kbnClient
 * @param integrationName
 * @param version
 */
export const installIntegration = async (
  kbnClient: KbnClient,
  integrationName: string,
  version?: string
): Promise<InstallPackageResponse> => {
  return kbnClient
    .request<InstallPackageResponse>({
      method: 'POST',
      path: epmRouteService.getInstallPath(integrationName, version),
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};

interface AddCrowdStrikeIntegrationToAgentPolicyOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  /** The CrowdStrike API URL */
  apiUrl: string;
  /** The CrowdStrike API client ID */
  clientId: string;
  /** The CrowdStrike API client secret */
  clientSecret: string;
  integrationPolicyName?: string;
  /** Set to `true` if wanting to add the integration to the agent policy even if that agent policy already has one  */
  force?: boolean;
}

export const addCrowdStrikeIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  apiUrl,
  clientId,
  clientSecret,
  integrationPolicyName = `CrowdStrike policy (${Math.random().toString().substring(2, 6)})`,
  force = false,
}: AddCrowdStrikeIntegrationToAgentPolicyOptions): Promise<PackagePolicy> => {
  // If `force` is `false and agent policy already has a CrowdStrike integration, exit here
  if (!force) {
    log.debug(
      `Checking to see if agent policy [${agentPolicyId}] already includes a CrowdStrike integration policy`
    );
    const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);
    log.verbose(agentPolicy);
    const integrationPolicies = agentPolicy.package_policies ?? [];

    for (const integrationPolicy of integrationPolicies) {
      if (integrationPolicy.package?.name === 'crowdstrike') {
        log.debug(
          `Returning existing CrowdStrike Integration Policy included in agent policy [${agentPolicyId}]`
        );
        return integrationPolicy;
      }
    }
  }

  // Try to get package info, install if not available
  let packageInfo;
  try {
    packageInfo = await fetchPackageInfo(kbnClient, 'crowdstrike');
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      log.info('CrowdStrike package not found, installing it first...');
      await installIntegration(kbnClient, 'crowdstrike');
      packageInfo = await fetchPackageInfo(kbnClient, 'crowdstrike');
    } else {
      throw error;
    }
  }

  const { version: packageVersion, name: packageName, title: packageTitle } = packageInfo;

  log.debug(
    `Creating new CrowdStrike integration policy [package v${packageVersion}] and adding it to agent policy [${agentPolicyId}]`
  );

  return createIntegrationPolicy(kbnClient, {
    name: integrationPolicyName,
    description: `Created by script: ${__filename}`,
    policy_id: agentPolicyId,
    policy_ids: [agentPolicyId],
    enabled: true,
    inputs: [
      {
        type: 'cel',
        policy_template: 'crowdstrike',
        enabled: true,
        vars: {
          client_id: {
            value: clientId,
            type: 'text',
          },
          client_secret: {
            value: clientSecret,
            type: 'password',
          },
          url: {
            value: apiUrl,
            type: 'text',
          },
          token_url: {
            value: `${apiUrl}/oauth2/token`,
            type: 'text',
          },
          scopes: {
            value: [],
            type: 'text',
          },
          enable_request_tracer: {
            value: false,
            type: 'bool',
          },
          proxy_url: {
            type: 'text',
          },
        },
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'crowdstrike.alert',
            },
            vars: {
              initial_interval: {
                value: '30m',
                type: 'text',
              },
              interval: {
                value: '30s',
                type: 'text',
              },
              batch_size: {
                value: 1000,
                type: 'text',
              },
              http_client_timeout: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'crowdstrike-alert'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              preserve_duplicate_custom_fields: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'crowdstrike.host',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              batch_size: {
                value: 1000,
                type: 'text',
              },
              http_client_timeout: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'crowdstrike-host'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              preserve_duplicate_custom_fields: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
          {
            enabled: false,
            data_stream: {
              type: 'logs',
              dataset: 'crowdstrike.vulnerability',
            },
            vars: {
              initial_interval: {
                value: '24h',
                type: 'text',
              },
              interval: {
                value: '5m',
                type: 'text',
              },
              batch_size: {
                value: 1000,
                type: 'text',
              },
              http_client_timeout: {
                value: '30s',
                type: 'text',
              },
              tags: {
                value: ['forwarded', 'crowdstrike-vulnerability'],
                type: 'text',
              },
              preserve_original_event: {
                value: false,
                type: 'bool',
              },
              preserve_duplicate_custom_fields: {
                value: false,
                type: 'bool',
              },
              processors: {
                type: 'yaml',
              },
            },
          },
        ],
      },
    ],
    package: {
      name: packageName,
      title: packageTitle,
      version: packageVersion,
    },
  });
};
