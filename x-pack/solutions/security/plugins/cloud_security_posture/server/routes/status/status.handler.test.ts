/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Jest with Kibana mocks (L2): orchestration tests for `getCspStatus` —
 * exercises the real dep fan-out (ES + Fleet + SO + agent service) with
 * each dep mocked at its service boundary.
 *
 * The pure state machine (`calculateIntegrationStatus`) is covered
 * exhaustively at L1 in `status.test.ts`. This file asserts a
 * representative case per status to prove the orchestration wires each
 * integration's inputs (`findingsLatest{Cspm,Kspm}`,
 * `vulnerabilitiesLatest`) to the correct `calculateIntegrationStatus`
 * call — a regression that L1 cannot catch because it doesn't exercise
 * the wiring.
 */

import { errors } from '@elastic/elasticsearch';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_VULNERABILITIES_INDEX_PATTERN,
  FINDINGS_INDEX_PATTERN,
  STATUS_ROUTE_PATH,
} from '@kbn/cloud-security-posture-common';
import {
  createMockAgentService,
  createMockAgentPolicyService,
} from '@kbn/fleet-plugin/server/mocks';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import type { AgentPolicy, Installation, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { AgentService, PackagePolicyClient, PackageService } from '@kbn/fleet-plugin/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  VULNERABILITIES_INDEX_PATTERN,
} from '../../../common/constants';
import {
  defineGetCspStatusRoute,
  getCspStatus,
  INDEX_TIMEOUT_IN_MINUTES,
  INDEX_TIMEOUT_IN_MINUTES_CNVM,
} from './status';

type CheckIndexStatusResult = 'empty' | 'not-empty' | 'unprivileged';
type PostureType = 'cspm' | 'kspm' | 'vuln_mgmt';

interface EsSearchScenario {
  hasMisconfigurationsFindings: boolean;
  hasVulnerabilitiesFindings: boolean;
  findingsLatestIndexStatusAll: CheckIndexStatusResult;
  findingsIndexStatusAll: CheckIndexStatusResult;
  scoreIndexStatusAll: CheckIndexStatusResult;
  findingsLatestIndexStatusCspm: CheckIndexStatusResult;
  findingsIndexStatusCspm: CheckIndexStatusResult;
  scoreIndexStatusCspm: CheckIndexStatusResult;
  findingsLatestIndexStatusKspm: CheckIndexStatusResult;
  findingsIndexStatusKspm: CheckIndexStatusResult;
  scoreIndexStatusKspm: CheckIndexStatusResult;
  vulnerabilitiesLatestIndexStatus: CheckIndexStatusResult;
  vulnerabilitiesIndexStatus: CheckIndexStatusResult;
}

const emptyEsScenario = (): EsSearchScenario => ({
  hasMisconfigurationsFindings: false,
  hasVulnerabilitiesFindings: false,
  findingsLatestIndexStatusAll: 'empty',
  findingsIndexStatusAll: 'empty',
  scoreIndexStatusAll: 'empty',
  findingsLatestIndexStatusCspm: 'empty',
  findingsIndexStatusCspm: 'empty',
  scoreIndexStatusCspm: 'empty',
  findingsLatestIndexStatusKspm: 'empty',
  findingsIndexStatusKspm: 'empty',
  scoreIndexStatusKspm: 'empty',
  vulnerabilitiesLatestIndexStatus: 'empty',
  vulnerabilitiesIndexStatus: 'empty',
});

const securityException = () =>
  new errors.ResponseError({
    statusCode: 403,
    body: { error: { type: 'security_exception', reason: 'no permission' } },
    headers: {},
    meta: {} as never,
    warnings: null,
  });

const installationFixture = (installStartedAt: string): Installation =>
  ({
    installed_kibana: [],
    installed_es: [],
    package_assets: [],
    es_index_patterns: { findings: 'logs-cloud_security_posture.findings-*' },
    name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    version: '1.9.0',
    install_version: '1.9.0',
    install_status: 'installed',
    install_started_at: installStartedAt,
    install_source: 'registry',
    install_format_schema_version: '1.0.0',
    keep_policies_up_to_date: true,
    verification_status: 'verified',
    verification_key_id: 'mock',
  } as unknown as Installation);

const packagePolicyFor = (postureType: PostureType, agentPolicyId: string): PackagePolicy => {
  const policy = createPackagePolicyMock();
  policy.id = `package-policy-${postureType}`;
  policy.name = `package-policy-${postureType}`;
  policy.policy_ids = [agentPolicyId];
  policy.package = {
    name: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    title: 'Cloud Security Posture',
    version: '1.9.0',
  };
  policy.inputs = [
    {
      enabled: true,
      type: `cloudbeat/${postureType}`,
      policy_template: postureType,
      streams: [],
    } as unknown as PackagePolicy['inputs'][number],
  ];
  return policy;
};

const agentPolicyFor = (id: string): AgentPolicy =>
  ({
    id,
    name: id,
    namespace: 'default',
    package_policies: [],
    monitoring_enabled: [],
    revision: 1,
    updated_at: '2026-01-01T00:00:00Z',
    updated_by: 'test',
    is_protected: false,
    status: 'active',
  } as unknown as AgentPolicy);

interface OrchestrationDeps {
  esClient: jest.Mocked<ElasticsearchClient>;
  soClient: jest.Mocked<SavedObjectsClientContract>;
  agentPolicyService: ReturnType<typeof createMockAgentPolicyService>;
  agentService: ReturnType<typeof createMockAgentService>;
  packagePolicyService: jest.Mocked<PackagePolicyClient>;
  packageService: PackageService;
  packageServiceMocks: {
    getInstallation: jest.Mock;
    fetchFindLatestPackage: jest.Mock;
  };
  logger: ReturnType<typeof loggerMock.create>;
  isPluginInitialized: jest.Mock<boolean, []>;
}

const createOrchestrationDeps = (): OrchestrationDeps => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();
  const agentPolicyService = createMockAgentPolicyService();
  const agentService = createMockAgentService();
  const packagePolicyService = {
    list: jest.fn(),
  } as unknown as jest.Mocked<PackagePolicyClient>;
  const getInstallation = jest.fn();
  const fetchFindLatestPackage = jest.fn().mockResolvedValue({ version: '1.9.0' });
  const packageService = {
    asInternalUser: {
      getInstallation,
      fetchFindLatestPackage,
    },
  } as unknown as PackageService;
  const logger = loggerMock.create();
  const isPluginInitialized = jest.fn<boolean, []>(() => true);

  return {
    esClient,
    soClient,
    agentPolicyService,
    agentService,
    packagePolicyService,
    packageService,
    packageServiceMocks: { getInstallation, fetchFindLatestPackage },
    logger,
    isPluginInitialized,
  };
};

const setupEsSearch = (esClient: jest.Mocked<ElasticsearchClient>, scenario: EsSearchScenario) => {
  esClient.search.mockImplementation((req) => {
    const request = req as { index: string; size?: number; query?: any };
    const index = request.index;
    const isHasFindings = request.size === 0;
    const postureFilter = request.query?.bool?.filter?.find?.(
      (f: { term?: { safe_posture_type?: string } }) => f.term?.safe_posture_type
    );
    const posture: PostureType | undefined = postureFilter?.term?.safe_posture_type;

    if (isHasFindings) {
      if (index === CDR_MISCONFIGURATIONS_INDEX_PATTERN) {
        return Promise.resolve({
          hits: {
            total: { value: scenario.hasMisconfigurationsFindings ? 1 : 0, relation: 'eq' },
            hits: [],
          },
        }) as unknown as ReturnType<ElasticsearchClient['search']>;
      }
      if (index === CDR_VULNERABILITIES_INDEX_PATTERN) {
        return Promise.resolve({
          hits: {
            total: { value: scenario.hasVulnerabilitiesFindings ? 1 : 0, relation: 'eq' },
            hits: [],
          },
        }) as unknown as ReturnType<ElasticsearchClient['search']>;
      }
      throw new Error(`unexpected has-findings call for index=${index}`);
    }

    let result: CheckIndexStatusResult;
    if (posture === 'cspm' && index === CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS) {
      result = scenario.findingsLatestIndexStatusCspm;
    } else if (posture === 'cspm' && index === FINDINGS_INDEX_PATTERN) {
      result = scenario.findingsIndexStatusCspm;
    } else if (posture === 'cspm' && index === BENCHMARK_SCORE_INDEX_DEFAULT_NS) {
      result = scenario.scoreIndexStatusCspm;
    } else if (posture === 'kspm' && index === CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS) {
      result = scenario.findingsLatestIndexStatusKspm;
    } else if (posture === 'kspm' && index === FINDINGS_INDEX_PATTERN) {
      result = scenario.findingsIndexStatusKspm;
    } else if (posture === 'kspm' && index === BENCHMARK_SCORE_INDEX_DEFAULT_NS) {
      result = scenario.scoreIndexStatusKspm;
    } else if (index === CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN) {
      result = scenario.vulnerabilitiesLatestIndexStatus;
    } else if (index === VULNERABILITIES_INDEX_PATTERN) {
      result = scenario.vulnerabilitiesIndexStatus;
    } else if (!posture && index === CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS) {
      result = scenario.findingsLatestIndexStatusAll;
    } else if (!posture && index === FINDINGS_INDEX_PATTERN) {
      result = scenario.findingsIndexStatusAll;
    } else if (!posture && index === BENCHMARK_SCORE_INDEX_DEFAULT_NS) {
      result = scenario.scoreIndexStatusAll;
    } else {
      throw new Error(`unexpected es search call: index=${index} posture=${posture ?? 'none'}`);
    }

    if (result === 'unprivileged') {
      return Promise.reject(securityException()) as unknown as ReturnType<
        ElasticsearchClient['search']
      >;
    }

    return Promise.resolve({
      hits: {
        total: { value: result === 'not-empty' ? 1 : 0, relation: 'eq' },
        hits: result === 'not-empty' ? [{ _id: '1', _index: index }] : [],
      },
    }) as unknown as ReturnType<ElasticsearchClient['search']>;
  });
};

const setupPackagePolicies = (
  packagePolicyService: jest.Mocked<PackagePolicyClient>,
  installedPackagePolicies: PackagePolicy[]
) => {
  packagePolicyService.list.mockImplementation((async (
    _so: SavedObjectsClientContract,
    _query: unknown
  ) => ({
    items: installedPackagePolicies,
    total: installedPackagePolicies.length,
    page: 1,
    perPage: 10000,
  })) as PackagePolicyClient['list']);
};

const setupAgents = (
  agentPolicyService: ReturnType<typeof createMockAgentPolicyService>,
  agentService: ReturnType<typeof createMockAgentService>,
  healthyAgentsByPolicyId: Record<string, number>
) => {
  agentPolicyService.getByIds.mockImplementation(async (_so, ids: unknown) => {
    return (ids as string[]).map(agentPolicyFor);
  });
  (agentService.asInternalUser.getAgentStatusForAgentPolicy as jest.Mock).mockImplementation(
    async (agentPolicyId?: string) => ({
      online: agentPolicyId ? healthyAgentsByPolicyId[agentPolicyId] ?? 0 : 0,
      updating: 0,
      offline: 0,
      error: 0,
      inactive: 0,
      enrolling: 0,
      unenrolling: 0,
      unenrolled: 0,
      other: 0,
      events: 0,
      total: 0,
      all: 0,
      active: 0,
    })
  );
};

const setupInstallation = (
  packageServiceMocks: OrchestrationDeps['packageServiceMocks'],
  installation: Installation | undefined
) => {
  packageServiceMocks.getInstallation.mockResolvedValue(installation);
};

const callGetCspStatus = async (deps: OrchestrationDeps) =>
  getCspStatus({
    logger: deps.logger,
    esClient: deps.esClient,
    soClient: deps.soClient,
    agentPolicyService: deps.agentPolicyService,
    agentService: deps.agentService as unknown as AgentService,
    packagePolicyService: deps.packagePolicyService,
    packageService: deps.packageService,
    isPluginInitialized: deps.isPluginInitialized,
  });

describe('CSP status route', () => {
  describe('route registration', () => {
    it('registers the GET route at the canonical path with read privileges', () => {
      const router = httpServiceMock.createRouter();
      defineGetCspStatusRoute(router as unknown as Parameters<typeof defineGetCspStatusRoute>[0]);

      const [config] = router.versioned.get.mock.calls[0];
      expect(config.path).toEqual(STATUS_ROUTE_PATH);
      expect(config.access).toEqual('internal');
      expect(config.security?.authz).toMatchObject({
        requiredPrivileges: ['cloud-security-posture-read'],
      });
    });
  });

  describe('getCspStatus orchestration', () => {
    let deps: OrchestrationDeps;

    beforeEach(() => {
      jest.clearAllMocks();
      deps = createOrchestrationDeps();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('STATUS = INDEXED', () => {
      it(`Return hasMisconfigurationsFindings true when there are latest findings but no installed integrations`, async () => {
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          hasMisconfigurationsFindings: true,
        });
        setupPackagePolicies(deps.packagePolicyService, []);
        setupAgents(deps.agentPolicyService, deps.agentService, {});
        setupInstallation(deps.packageServiceMocks, undefined);

        const res = await callGetCspStatus(deps);

        expect(res.hasMisconfigurationsFindings).toBe(true);
      });

      it(`Return hasMisconfigurationsFindings true when there are only findings in third party index`, async () => {
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          hasMisconfigurationsFindings: true,
        });
        setupPackagePolicies(deps.packagePolicyService, []);
        setupAgents(deps.agentPolicyService, deps.agentService, {});
        setupInstallation(deps.packageServiceMocks, undefined);

        const res = await callGetCspStatus(deps);

        expect(res.hasMisconfigurationsFindings).toBe(true);
      });

      it(`Return hasMisconfigurationsFindings false when there are no findings`, async () => {
        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, []);
        setupAgents(deps.agentPolicyService, deps.agentService, {});
        setupInstallation(deps.packageServiceMocks, undefined);

        const res = await callGetCspStatus(deps);

        expect(res.hasMisconfigurationsFindings).toBe(false);
      });

      it(`Return kspm status indexed when CDR latest misconfigurations alias contains new kspm documents`, async () => {
        const kspmPackagePolicy = packagePolicyFor('kspm', 'agent-policy-kspm');
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          findingsLatestIndexStatusKspm: 'not-empty',
        });
        setupPackagePolicies(deps.packagePolicyService, [kspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-kspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.kspm.status).toBe('indexed');
      });

      it(`Return cspm status indexed when CDR latest misconfigurations alias contains new cspm documents`, async () => {
        const cspmPackagePolicy = packagePolicyFor('cspm', 'agent-policy-cspm');
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          findingsLatestIndexStatusCspm: 'not-empty',
        });
        setupPackagePolicies(deps.packagePolicyService, [cspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-cspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.cspm.status).toBe('indexed');
      });

      it(`Return vuln_mgmt status indexed when CDR latest vulnerabilities index contains new documents`, async () => {
        const vulnPackagePolicy = packagePolicyFor('vuln_mgmt', 'agent-policy-vuln_mgmt');
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          vulnerabilitiesLatestIndexStatus: 'not-empty',
        });
        setupPackagePolicies(deps.packagePolicyService, [vulnPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, {
          'agent-policy-vuln_mgmt': 1,
        });
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.vuln_mgmt.status).toBe('indexed');
      });
    });

    describe('STATUS = INDEXING', () => {
      // Originally `describe.skip`-ed at L4 (FTR) under
      // https://github.com/elastic/kibana/issues/240000 due to a bulk-insert vs
      // ignore_unavailable race. Deterministic at L2 — no real ES.
      it(`Return kspm status indexing when stream contains documents but latest is empty and agents are connected`, async () => {
        const kspmPackagePolicy = packagePolicyFor('kspm', 'agent-policy-kspm');
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          findingsIndexStatusKspm: 'not-empty',
        });
        setupPackagePolicies(deps.packagePolicyService, [kspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-kspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.kspm.status).toBe('indexing');
      });

      it(`Return cspm status indexing when stream contains documents but latest is empty and agents are connected`, async () => {
        const cspmPackagePolicy = packagePolicyFor('cspm', 'agent-policy-cspm');
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          findingsIndexStatusCspm: 'not-empty',
        });
        setupPackagePolicies(deps.packagePolicyService, [cspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-cspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.cspm.status).toBe('indexing');
      });

      it(`Return vuln_mgmt status indexing when stream contains documents but latest is empty and agents are connected`, async () => {
        const vulnPackagePolicy = packagePolicyFor('vuln_mgmt', 'agent-policy-vuln_mgmt');
        setupEsSearch(deps.esClient, {
          ...emptyEsScenario(),
          vulnerabilitiesIndexStatus: 'not-empty',
        });
        setupPackagePolicies(deps.packagePolicyService, [vulnPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, {
          'agent-policy-vuln_mgmt': 1,
        });
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.vuln_mgmt.status).toBe('indexing');
      });
    });

    describe('STATUS = INDEX_TIMEOUT', () => {
      const NOW = new Date('2026-01-01T00:00:00Z');

      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);
      });

      it(`Should return index-timeout when installed kspm and it has been more than ${INDEX_TIMEOUT_IN_MINUTES} minutes since installation`, async () => {
        const kspmPackagePolicy = packagePolicyFor('kspm', 'agent-policy-kspm');
        const installStartedAt = new Date(
          NOW.getTime() - (INDEX_TIMEOUT_IN_MINUTES + 1) * 60 * 1000
        ).toISOString();

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [kspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-kspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(installStartedAt));

        const res = await callGetCspStatus(deps);

        expect(res.kspm.status).toBe('index-timeout');
      });

      it(`Should return index-timeout when installed cspm and it has been more than ${INDEX_TIMEOUT_IN_MINUTES} minutes since installation`, async () => {
        const cspmPackagePolicy = packagePolicyFor('cspm', 'agent-policy-cspm');
        const installStartedAt = new Date(
          NOW.getTime() - (INDEX_TIMEOUT_IN_MINUTES + 1) * 60 * 1000
        ).toISOString();

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [cspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-cspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(installStartedAt));

        const res = await callGetCspStatus(deps);

        expect(res.cspm.status).toBe('index-timeout');
      });

      it(`Should return index-timeout when installed vuln_mgmt and it has been more than ${INDEX_TIMEOUT_IN_MINUTES_CNVM} minutes since installation`, async () => {
        const vulnPackagePolicy = packagePolicyFor('vuln_mgmt', 'agent-policy-vuln_mgmt');
        const installStartedAt = new Date(
          NOW.getTime() - (INDEX_TIMEOUT_IN_MINUTES_CNVM + 1) * 60 * 1000
        ).toISOString();

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [vulnPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, {
          'agent-policy-vuln_mgmt': 1,
        });
        setupInstallation(deps.packageServiceMocks, installationFixture(installStartedAt));

        const res = await callGetCspStatus(deps);

        expect(res.vuln_mgmt.status).toBe('index-timeout');
      });
    });

    describe('STATUS = NOT_DEPLOYED / NOT_INSTALLED', () => {
      it(`Should return not-deployed when installed kspm, no findings on either indices and no healthy agents`, async () => {
        const kspmPackagePolicy = packagePolicyFor('kspm', 'agent-policy-kspm');

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [kspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, {});
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.kspm.status).toBe('not-deployed');
        expect(res.cspm.status).toBe('not-installed');
        expect(res.vuln_mgmt.status).toBe('not-installed');
        expect(res.kspm.healthyAgents).toBe(0);
        expect(res.kspm.installedPackagePolicies).toBe(1);
      });

      it(`Should return not-deployed when installed cspm, no findings on either indices and no healthy agents`, async () => {
        const cspmPackagePolicy = packagePolicyFor('cspm', 'agent-policy-cspm');

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [cspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, {});
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.cspm.status).toBe('not-deployed');
        expect(res.kspm.status).toBe('not-installed');
        expect(res.vuln_mgmt.status).toBe('not-installed');
        expect(res.cspm.healthyAgents).toBe(0);
        expect(res.cspm.installedPackagePolicies).toBe(1);
      });

      it(`Should return not-deployed when installed vuln_mgmt, no findings on either indices and no healthy agents`, async () => {
        const vulnPackagePolicy = packagePolicyFor('vuln_mgmt', 'agent-policy-vuln_mgmt');

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [vulnPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, {});
        setupInstallation(deps.packageServiceMocks, installationFixture(new Date().toISOString()));

        const res = await callGetCspStatus(deps);

        expect(res.vuln_mgmt.status).toBe('not-deployed');
        expect(res.cspm.status).toBe('not-installed');
        expect(res.kspm.status).toBe('not-installed');
        expect(res.vuln_mgmt.healthyAgents).toBe(0);
        expect(res.vuln_mgmt.installedPackagePolicies).toBe(1);
      });
    });

    describe('STATUS = WAITING_FOR_RESULTS', () => {
      const NOW = new Date('2026-01-01T00:00:00Z');

      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);
      });

      it(`Should return waiting_for_results when installed kspm and it has been less than ${INDEX_TIMEOUT_IN_MINUTES} minutes since installation`, async () => {
        const kspmPackagePolicy = packagePolicyFor('kspm', 'agent-policy-kspm');
        const installStartedAt = new Date(
          NOW.getTime() - (INDEX_TIMEOUT_IN_MINUTES - 1) * 60 * 1000
        ).toISOString();

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [kspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-kspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(installStartedAt));

        const res = await callGetCspStatus(deps);

        expect(res.kspm.status).toBe('waiting_for_results');
      });

      it(`Should return waiting_for_results when installed cspm and it has been less than ${INDEX_TIMEOUT_IN_MINUTES} minutes since installation`, async () => {
        const cspmPackagePolicy = packagePolicyFor('cspm', 'agent-policy-cspm');
        const installStartedAt = new Date(
          NOW.getTime() - (INDEX_TIMEOUT_IN_MINUTES - 1) * 60 * 1000
        ).toISOString();

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [cspmPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, { 'agent-policy-cspm': 1 });
        setupInstallation(deps.packageServiceMocks, installationFixture(installStartedAt));

        const res = await callGetCspStatus(deps);

        expect(res.cspm.status).toBe('waiting_for_results');
      });

      it(`Should return waiting_for_results when installed vuln_mgmt and it has been less than ${INDEX_TIMEOUT_IN_MINUTES_CNVM} minutes since installation`, async () => {
        const vulnPackagePolicy = packagePolicyFor('vuln_mgmt', 'agent-policy-vuln_mgmt');
        const installStartedAt = new Date(
          NOW.getTime() - (INDEX_TIMEOUT_IN_MINUTES_CNVM - 1) * 60 * 1000
        ).toISOString();

        setupEsSearch(deps.esClient, emptyEsScenario());
        setupPackagePolicies(deps.packagePolicyService, [vulnPackagePolicy]);
        setupAgents(deps.agentPolicyService, deps.agentService, {
          'agent-policy-vuln_mgmt': 1,
        });
        setupInstallation(deps.packageServiceMocks, installationFixture(installStartedAt));

        const res = await callGetCspStatus(deps);

        expect(res.vuln_mgmt.status).toBe('waiting_for_results');
      });
    });
  });
});
