/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, StartServicesAccessor } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import type { NewPolicyData, PolicyConfig } from '../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../common/endpoint/types';
import { createMockEndpointAppContextService } from '../../../../endpoint/mocks';
import { applyPolicyChange, previewApplyPolicyChange } from './apply_policy_change';
import type { ApplyPolicyChangeDependencies } from './apply_policy_change';
import * as countEndpointsModule from './count_endpoints';
import * as policyLookup from './policy_lookup';
import {
  InvalidEndpointPolicyError,
  POLICY_ERROR_MESSAGES,
  PolicyBlockedChangeError,
  PolicyNoChangeError,
  PolicyVersionConflictError,
  PolicyWriteRejectedError,
  PolicyWriteUnverifiedError,
} from './policy_errors';

const SPACE_ID = 'space-marketing';
const POLICY_ID = 'policy-id-1';
const EXPECTED_VERSION = 'WzEsMV0=';
const generator = new FleetPackagePolicyGenerator();
const authenticatedUser = {
  username: 'analyst',
  roles: ['superuser'],
} as unknown as AuthenticatedUser;
const Enterprise = licenseMock.createLicense({ license: { type: 'enterprise' } });

const createEndpointPolicy = (
  overrides: Parameters<FleetPackagePolicyGenerator['generateEndpointPackagePolicy']>[0] = {}
) =>
  generator.generateEndpointPackagePolicy({
    id: POLICY_ID,
    name: 'Endpoint Policy',
    version: EXPECTED_VERSION,
    policy_ids: ['agent-policy-a'],
    ...overrides,
  });

const requireStoredPolicy = (policy: ReturnType<typeof createEndpointPolicy>): PolicyConfig => {
  const storedPolicy = policy.inputs[0]?.config?.policy?.value;
  if (storedPolicy == null) {
    throw new Error('expected generated endpoint package policy to include config.policy');
  }
  return storedPolicy;
};

const malwareChange = (value: ProtectionModes) => ({
  op: 'set_field' as const,
  path: 'windows.malware.mode',
  value,
});

const rawParams = (overrides: Record<string, unknown> = {}): unknown => ({
  idOrName: POLICY_ID,
  changes: [malwareChange(ProtectionModes.detect)],
  expectedVersion: EXPECTED_VERSION,
  ...overrides,
});

const tooDeep = (depth: number): unknown => {
  let value: unknown = 'leaf';
  for (let index = 0; index < depth; index++) {
    value = { nested: value };
  }
  return value;
};

const emptyEnrollment = {
  population: 'enrolled_agents' as const,
  source: 'no_agent_policy_assignments' as const,
  status: {},
};

const createWriteDeps = () => {
  const endpointAppContextService = createMockEndpointAppContextService();
  const request = httpServerMock.createKibanaRequest();
  const soClient = { sentinel: 'request-scoped-so-client' };
  const getStartServices = jest.fn(async () => [
    { savedObjects: { getScopedClient: jest.fn().mockReturnValue(soClient) } },
  ]) as unknown as StartServicesAccessor;

  endpointAppContextService.getEndpointAuthz.mockResolvedValue(
    getEndpointAuthzInitialStateMock({
      canWritePolicyManagement: true,
      canReadPolicyManagement: true,
      canReadSecuritySolution: true,
    })
  );
  Object.assign(endpointAppContextService, {
    security: {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(authenticatedUser),
      },
    },
  });

  const licenseService = endpointAppContextService.getLicenseService();
  licenseService.getLicenseType = jest.fn(() => 'enterprise');
  licenseService.getLicenseInformation = jest.fn(() => Enterprise);
  licenseService.isPlatinumPlus = jest.fn(() => true);
  licenseService.isEnterprise = jest.fn(() => true);

  const fleet = endpointAppContextService.getInternalFleetServices();
  const getById = jest.spyOn(fleet.packagePolicy, 'get');
  const listByName = jest.spyOn(fleet.packagePolicy, 'list');
  const update = jest.spyOn(fleet.packagePolicy, 'update');
  const ensureInCurrentSpace = jest.spyOn(fleet, 'ensureInCurrentSpace');
  ensureInCurrentSpace.mockResolvedValue(undefined);

  return {
    deps: {
      endpointAppContextService,
      getStartServices,
      request,
      spaceId: SPACE_ID,
    } satisfies ApplyPolicyChangeDependencies,
    endpointAppContextService,
    getById,
    listByName,
    update,
    soClient,
    esClient: endpointAppContextService.getInternalEsClient(),
  };
};

describe('apply policy change', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects oversized input before authorization or policy I/O', async () => {
    const { deps, endpointAppContextService, getById, update } = createWriteDeps();

    await expect(previewApplyPolicyChange(deps, tooDeep(20))).rejects.toMatchObject({
      name: 'PolicyChangePreparationError',
      code: 'invalid_input',
    });
    expect(endpointAppContextService.getEndpointAuthz).not.toHaveBeenCalled();
    expect(getById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a non-agent apply source before authorization', async () => {
    const { deps, endpointAppContextService, getById, update } = createWriteDeps();

    await expect(
      applyPolicyChange(deps, rawParams(), { callSource: 'user' })
    ).rejects.toBeInstanceOf(PolicyWriteRejectedError);
    expect(endpointAppContextService.getEndpointAuthz).not.toHaveBeenCalled();
    expect(getById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a null user after write authz and before policy reads', async () => {
    const { deps, endpointAppContextService, getById, update } = createWriteDeps();
    (
      endpointAppContextService as unknown as {
        security: { authc: { getCurrentUser: jest.Mock } };
      }
    ).security.authc.getCurrentUser.mockReturnValue(null);

    await expect(previewApplyPolicyChange(deps, rawParams())).rejects.toBeInstanceOf(
      PolicyWriteRejectedError
    );
    expect(endpointAppContextService.getEndpointAuthz).toHaveBeenCalledTimes(1);
    expect(getById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a stale version before assessment blockers, enrollment, or Fleet update', async () => {
    const { deps, getById, update } = createWriteDeps();
    getById.mockResolvedValue(createEndpointPolicy());
    const countSpy = jest.spyOn(countEndpointsModule, 'countEndpoints');

    await expect(
      applyPolicyChange(deps, rawParams({ expectedVersion: `  ${EXPECTED_VERSION}  ` }), {
        callSource: 'agent',
      })
    ).rejects.toBeInstanceOf(PolicyVersionConflictError);
    expect(update).not.toHaveBeenCalled();
    expect(countSpy).not.toHaveBeenCalled();
  });

  it('refuses a blocked change before treating an empty normalized diff as no_change', async () => {
    const { deps, getById, update } = createWriteDeps();
    const policy = createEndpointPolicy();
    requireStoredPolicy(policy).windows.malware.mode = ProtectionModes.detect;
    getById.mockResolvedValue(policy);
    const countSpy = jest.spyOn(countEndpointsModule, 'countEndpoints');

    await expect(
      applyPolicyChange(
        deps,
        rawParams({
          changes: [
            malwareChange(ProtectionModes.detect),
            { op: 'set_field', path: 'global_manifest_version', value: '2020-01-01' },
          ],
        }),
        { callSource: 'agent' }
      )
    ).rejects.toBeInstanceOf(PolicyBlockedChangeError);
    expect(update).not.toHaveBeenCalled();
    expect(countSpy).not.toHaveBeenCalled();
  });

  it('refuses a no-op after blockers are clear', async () => {
    const { deps, getById, update } = createWriteDeps();
    const policy = createEndpointPolicy();
    requireStoredPolicy(policy).windows.malware.mode = ProtectionModes.detect;
    getById.mockResolvedValue(policy);
    const countSpy = jest.spyOn(countEndpointsModule, 'countEndpoints');

    await expect(
      applyPolicyChange(deps, rawParams(), { callSource: 'agent' })
    ).rejects.toBeInstanceOf(PolicyNoChangeError);
    expect(update).not.toHaveBeenCalled();
    expect(countSpy).not.toHaveBeenCalled();
  });

  it('refuses a managed policy through the blocked-change path before enrollment or Fleet update', async () => {
    const { deps, getById, update } = createWriteDeps();
    const policy = createEndpointPolicy({ is_managed: true });
    requireStoredPolicy(policy).windows.malware.mode = ProtectionModes.prevent;
    getById.mockResolvedValue(policy);
    const countSpy = jest.spyOn(countEndpointsModule, 'countEndpoints');

    await expect(
      applyPolicyChange(deps, rawParams(), { callSource: 'agent' })
    ).rejects.toBeInstanceOf(PolicyBlockedChangeError);
    expect(update).not.toHaveBeenCalled();
    expect(countSpy).not.toHaveBeenCalled();
  });

  it('forwards the complete Fleet payload with the assessment token, raw proposal, and user', async () => {
    const { deps, getById, update, soClient, esClient } = createWriteDeps();
    const policy = createEndpointPolicy();
    requireStoredPolicy(policy).windows.malware.mode = ProtectionModes.prevent;
    getById.mockResolvedValue(policy);
    const returned = createEndpointPolicy({
      revision: 2,
      version: 'WzIsMV0=',
    });
    requireStoredPolicy(returned).windows.malware.mode = ProtectionModes.detect;
    update.mockResolvedValue(returned);
    jest.spyOn(countEndpointsModule, 'countEndpoints').mockResolvedValue({
      population: 'enrolled_agents',
      source: 'fleet_status_aggregation',
      status: { all: 3 },
    });

    const preview = await previewApplyPolicyChange(deps, rawParams());
    const result = await applyPolicyChange(deps, rawParams(), { callSource: 'agent' });
    const payload = update.mock.calls[0][3];

    expect(preview.assessment.proposedConfig).toBeDefined();
    expect(preview.agentPolicyCount).toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toBe(soClient);
    expect(update.mock.calls[0][1]).toBe(esClient);
    expect(update.mock.calls[0][2]).toBe(POLICY_ID);
    expect(payload).toEqual(
      expect.objectContaining({
        name: policy.name,
        version: EXPECTED_VERSION,
      })
    );
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('revision');
    expect(payload.inputs[0].config?.policy?.value).toEqual(preview.assessment.proposedConfig);
    expect(update.mock.calls[0][4]).toEqual({ user: authenticatedUser });
    expect(result.before).toEqual({
      id: POLICY_ID,
      name: 'Endpoint Policy',
      revision: policy.revision,
      version: EXPECTED_VERSION,
    });
    expect(result.after.version).toBe('WzIsMV0=');
    expect(result.requestedChanges).toEqual(preview.assessment.changes);
    expect(result.residual).toEqual([]);
  });

  it('derives residual from the Fleet-returned normalized config, including concurrent differences', async () => {
    const { deps, getById, update } = createWriteDeps();
    const policy = createEndpointPolicy();
    requireStoredPolicy(policy).windows.malware.mode = ProtectionModes.prevent;
    getById.mockResolvedValue(policy);
    const returned = createEndpointPolicy({
      revision: 2,
      version: 'WzIsMV0=',
    });
    requireStoredPolicy(returned).windows.malware.mode = ProtectionModes.prevent;
    update.mockResolvedValue(returned);
    jest.spyOn(countEndpointsModule, 'countEndpoints').mockResolvedValue(emptyEnrollment);

    const result = await applyPolicyChange(deps, rawParams(), { callSource: 'agent' });

    expect(result.residual).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'windows.malware.mode',
          from: ProtectionModes.detect,
          to: ProtectionModes.prevent,
        }),
      ])
    );
  });

  it('classifies a Fleet throw as unverified and reports the observed identity without claiming success', async () => {
    const { deps, getById, listByName, update } = createWriteDeps();
    const policy = createEndpointPolicy();
    requireStoredPolicy(policy).windows.malware.mode = ProtectionModes.prevent;
    const observed = createEndpointPolicy({ revision: 5, version: 'WzUsMV0=' });
    requireStoredPolicy(observed).windows.malware.mode = ProtectionModes.detect;
    getById.mockResolvedValueOnce(policy).mockResolvedValueOnce(observed);
    update.mockRejectedValue(new Error('so version conflict'));
    jest.spyOn(countEndpointsModule, 'countEndpoints').mockResolvedValue(emptyEnrollment);
    const getByIdHelper = jest.spyOn(policyLookup, 'getPackagePolicyById');

    await expect(
      applyPolicyChange(deps, rawParams(), { callSource: 'agent' })
    ).rejects.toMatchObject({
      name: 'PolicyWriteUnverifiedError',
      message: POLICY_ERROR_MESSAGES.write_unverified,
      before: expect.objectContaining({ id: POLICY_ID, version: EXPECTED_VERSION }),
      observed: expect.objectContaining({ id: POLICY_ID, version: 'WzUsMV0=' }),
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(listByName).not.toHaveBeenCalled();
    expect(getByIdHelper).toHaveBeenCalledTimes(2);
    expect(getByIdHelper).toHaveBeenLastCalledWith(expect.anything(), POLICY_ID);
  });

  it('classifies an unusable Fleet return as unverified and swallows a failed observation', async () => {
    const { deps, getById, update } = createWriteDeps();
    const policy = createEndpointPolicy();
    requireStoredPolicy(policy).windows.malware.mode = ProtectionModes.prevent;
    getById.mockResolvedValueOnce(policy).mockResolvedValueOnce({
      ...policy,
      package: { name: 'not-endpoint', title: 'Other', version: '1.0.0' },
    });
    update.mockResolvedValue({ ...createEndpointPolicy(), package: undefined });
    jest.spyOn(countEndpointsModule, 'countEndpoints').mockResolvedValue(emptyEnrollment);

    const error = await applyPolicyChange(deps, rawParams(), { callSource: 'agent' }).catch(
      (caught) => caught
    );

    expect(error).toBeInstanceOf(PolicyWriteUnverifiedError);
    expect((error as PolicyWriteUnverifiedError).before.id).toBe(POLICY_ID);
    expect((error as PolicyWriteUnverifiedError).observed).toBeUndefined();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('does not let a Fleet payload alias erase the residual baseline', async () => {
    const { deps, getById, update } = createWriteDeps();
    const policy = createEndpointPolicy();
    const stored = requireStoredPolicy(policy);
    stored.windows.malware.mode = ProtectionModes.prevent;
    (stored.mac.ransomware as { mode?: ProtectionModes }).mode = undefined;
    getById.mockResolvedValue(policy);
    const returned = createEndpointPolicy({ revision: 2, version: 'WzIsMV0=' });
    const returnedStored = requireStoredPolicy(returned);
    returnedStored.windows.malware.mode = ProtectionModes.detect;
    returnedStored.mac.ransomware.mode = ProtectionModes.off;
    update.mockImplementationOnce(async (_soClient, _esClient, _policyId, packagePolicyUpdate) => {
      const payload = packagePolicyUpdate as NewPolicyData;
      payload.inputs[0].config.policy.value.mac.ransomware.mode = ProtectionModes.off;
      return returned;
    });
    jest.spyOn(countEndpointsModule, 'countEndpoints').mockResolvedValue(emptyEnrollment);

    const result = await applyPolicyChange(deps, rawParams(), { callSource: 'agent' });

    expect(update).toHaveBeenCalledTimes(1);
    expect(result.residual).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'mac.ransomware.mode', to: ProtectionModes.off }),
      ])
    );
  });

  it('classifies a pre-call payload construction failure without observation or write classification', async () => {
    const { deps, getById, update } = createWriteDeps();
    const policy = createEndpointPolicy();
    const stored = requireStoredPolicy(policy);
    stored.windows.malware.mode = ProtectionModes.prevent;
    (stored.windows.popup.malware as { message?: string }).message = undefined;
    getById.mockResolvedValue(policy);
    const countSpy = jest
      .spyOn(countEndpointsModule, 'countEndpoints')
      .mockResolvedValue(emptyEnrollment);
    const getByIdHelper = jest.spyOn(policyLookup, 'getPackagePolicyById');

    await expect(
      applyPolicyChange(deps, rawParams(), { callSource: 'agent' })
    ).rejects.toBeInstanceOf(InvalidEndpointPolicyError);

    expect(countSpy).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
    expect(getByIdHelper).toHaveBeenCalledTimes(1);
    expect(getByIdHelper).toHaveBeenCalledWith(expect.anything(), POLICY_ID);
  });

  it('reads serverless from capabilities while preparing a shared assessment proposal', async () => {
    const { deps, endpointAppContextService, getById, update } = createWriteDeps();
    const isServerlessSpy = jest
      .spyOn(endpointAppContextService, 'isServerless')
      .mockReturnValue(true);
    const policy = createEndpointPolicy();
    requireStoredPolicy(policy).windows.ransomware.mode = ProtectionModes.off;
    getById.mockResolvedValue(policy);
    jest.spyOn(countEndpointsModule, 'countEndpoints').mockResolvedValue(emptyEnrollment);

    const preview = await previewApplyPolicyChange(deps, {
      idOrName: POLICY_ID,
      expectedVersion: EXPECTED_VERSION,
      changes: [
        {
          op: 'set_protection_level',
          protection: 'ransomware',
          mode: ProtectionModes.prevent,
        },
      ],
    });

    expect(isServerlessSpy).toHaveBeenCalled();
    expect(preview.assessment.proposedConfig).toBeDefined();
    expect(
      preview.assessment.changes.find((change) => change.path === 'windows.ransomware.mode')
        ?.eligibility
    ).toEqual({ eligible: true });
    expect(update).not.toHaveBeenCalled();
  });
});
