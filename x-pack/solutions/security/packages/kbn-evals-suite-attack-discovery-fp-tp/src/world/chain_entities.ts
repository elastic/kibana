/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FpTpChainDefinition, FpTpChainIds } from './chain';
import { FP_TP_BASE_TIME, FP_TP_ENTITY_INDEX } from './constants';
import type { FpTpIndexedEntity } from './types';

interface FpTpEntityRoleFields {
  readonly subType: string;
  readonly criticality: string;
  readonly riskLevel: string;
  readonly riskScoreNorm: number;
}

interface FpTpEntityRole {
  readonly host?: FpTpEntityRoleFields & { readonly asset: Record<string, unknown> };
  readonly user?: FpTpEntityRoleFields;
}

/**
 * What the entity store says the host and user are, which the `entity_role` check reads.
 * An ordinary workstation supports the alert; a management server contradicts it;
 * `unknown` has records with no role, so the check is neutral.
 */
const FP_TP_ENTITY_ROLES = {
  employee_workstation: {
    host: {
      subType: 'employee_workstation',
      criticality: 'medium_impact',
      riskLevel: 'Low',
      riskScoreNorm: 18,
      asset: { model: 'Latitude 7440', environment: 'corporate_workstation' },
    },
    user: {
      subType: 'employee',
      criticality: 'medium_impact',
      riskLevel: 'Low',
      riskScoreNorm: 12,
    },
  },
  sccm_distribution_point: {
    host: {
      subType: 'sccm_distribution_point',
      criticality: 'low_impact',
      riskLevel: 'High',
      riskScoreNorm: 74,
      asset: {
        owner: 'endpoint-engineering',
        vendor: 'Microsoft',
        model: 'Configuration Manager distribution point',
        environment: 'management',
      },
    },
    user: {
      subType: 'sccm_service_account',
      criticality: 'low_impact',
      riskLevel: 'Moderate',
      riskScoreNorm: 38,
    },
  },
  mdm_management: {
    host: {
      subType: 'mdm_management',
      criticality: 'low_impact',
      riskLevel: 'High',
      riskScoreNorm: 71,
      asset: {
        owner: 'endpoint-engineering',
        vendor: 'Microsoft',
        model: 'Intune managed provisioning host',
        environment: 'management',
      },
    },
    user: {
      subType: 'intune_admin',
      criticality: 'low_impact',
      riskLevel: 'Moderate',
      riskScoreNorm: 41,
    },
  },
  unknown: {},
} as const satisfies Record<string, FpTpEntityRole>;

export type FpTpEntityRoleKey = keyof typeof FP_TP_ENTITY_ROLES;

const timestamp = FP_TP_BASE_TIME.toISOString().replace(/\.\d{3}Z$/, '.000Z');

const roleEntityFields = (fields: FpTpEntityRoleFields | undefined): Record<string, unknown> =>
  fields
    ? {
        sub_type: fields.subType,
        risk: {
          calculated_level: fields.riskLevel,
          calculated_score_norm: fields.riskScoreNorm,
        },
      }
    : {};

/** Host and user entity store records for a chain, with the given role. */
export const buildChainEntities = (
  definition: FpTpChainDefinition,
  ids: FpTpChainIds,
  roleKey: FpTpEntityRoleKey,
  runMarker: string
): FpTpIndexedEntity[] => {
  const role: FpTpEntityRole = FP_TP_ENTITY_ROLES[roleKey];
  const { host, user } = definition;
  return [
    {
      index: FP_TP_ENTITY_INDEX,
      id: ids.hostEntityId,
      source: {
        '@timestamp': timestamp,
        labels: { ad_portable_seed: runMarker },
        host: { name: host.name, hostname: host.name, id: ids.hostId, os: host.os },
        ...(role.host ? { asset: { ...role.host.asset, criticality: role.host.criticality } } : {}),
        entity: {
          id: ids.hostEntityId,
          name: host.name,
          type: 'host',
          EngineMetadata: { Type: 'host' },
          ...roleEntityFields(role.host),
        },
      },
    },
    {
      index: FP_TP_ENTITY_INDEX,
      id: ids.userEntityId,
      source: {
        '@timestamp': timestamp,
        labels: { ad_portable_seed: runMarker },
        user: { name: user.name, domain: user.domain },
        host: { name: host.name, id: ids.hostId },
        ...(role.user ? { asset: { criticality: role.user.criticality } } : {}),
        entity: {
          id: ids.userEntityId,
          name: `${user.name}@${host.name}`,
          type: 'user',
          EngineMetadata: { Type: 'user' },
          ...roleEntityFields(role.user),
        },
      },
    },
  ];
};
