/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FP_TP_BASE_TIME,
  FP_TP_ENTITY_INDEX,
  FP_TP_TWIN_SEED_LABEL,
  type FpTpIndexedEntity,
} from '../../world';
import {
  ENCODED_POWERSHELL_HOST,
  ENCODED_POWERSHELL_USER,
  getEncodedPowershellIds,
  type EncodedPowershellVariant,
} from './ids';

const timestamp = FP_TP_BASE_TIME.toISOString().replace(/\.\d{3}Z$/, '.000Z');

const buildHostEntity = ({
  runMarker,
  subType,
  criticality,
  riskLevel,
  riskScoreNorm,
  asset,
}: {
  runMarker: string;
  subType: string;
  criticality: string;
  riskLevel: string;
  riskScoreNorm: number;
  asset: Record<string, unknown>;
}): FpTpIndexedEntity => {
  const { hostId, hostEntityId } = getEncodedPowershellIds(runMarker);
  return {
    index: FP_TP_ENTITY_INDEX,
    id: hostEntityId,
    source: {
      '@timestamp': timestamp,
      labels: { ad_portable_seed: runMarker },
      host: {
        name: ENCODED_POWERSHELL_HOST,
        hostname: ENCODED_POWERSHELL_HOST,
        id: hostId,
        os: { type: 'windows', name: 'Windows', version: 'test' },
      },
      asset: { ...asset, criticality },
      entity: {
        id: hostEntityId,
        name: ENCODED_POWERSHELL_HOST,
        type: 'host',
        sub_type: subType,
        EngineMetadata: { Type: 'host' },
        risk: {
          calculated_level: riskLevel,
          calculated_score_norm: riskScoreNorm,
        },
      },
    },
  };
};

const buildUserEntity = ({
  runMarker,
  subType,
  criticality,
  riskLevel,
  riskScoreNorm,
}: {
  runMarker: string;
  subType: string;
  criticality: string;
  riskLevel: string;
  riskScoreNorm: number;
}): FpTpIndexedEntity => {
  const { hostId, userEntityId } = getEncodedPowershellIds(runMarker);
  return {
    index: FP_TP_ENTITY_INDEX,
    id: userEntityId,
    source: {
      '@timestamp': timestamp,
      labels: { ad_portable_seed: runMarker },
      user: { name: ENCODED_POWERSHELL_USER, domain: 'CONTOSO' },
      host: { name: ENCODED_POWERSHELL_HOST, id: hostId },
      asset: { criticality },
      entity: {
        id: userEntityId,
        name: `${ENCODED_POWERSHELL_USER}@${ENCODED_POWERSHELL_HOST}`,
        type: 'user',
        sub_type: subType,
        EngineMetadata: { Type: 'user' },
        risk: {
          calculated_level: riskLevel,
          calculated_score_norm: riskScoreNorm,
        },
      },
    },
  };
};

export const buildEncodedPowershellEntities = (
  variant: EncodedPowershellVariant,
  runMarker: string = FP_TP_TWIN_SEED_LABEL
): FpTpIndexedEntity[] =>
  variant === 'tp'
    ? [
        buildHostEntity({
          runMarker,
          subType: 'employee_workstation',
          criticality: 'medium_impact',
          riskLevel: 'Low',
          riskScoreNorm: 18,
          asset: {
            name: 'Alice Chen laptop',
            owner: ENCODED_POWERSHELL_USER,
            model: 'ThinkPad T14',
            environment: 'corporate_workstation',
          },
        }),
        buildUserEntity({
          runMarker,
          subType: 'employee',
          criticality: 'medium_impact',
          riskLevel: 'Low',
          riskScoreNorm: 12,
        }),
      ]
    : [
        buildHostEntity({
          runMarker,
          subType: 'mdm_management',
          criticality: 'low_impact',
          riskLevel: 'High',
          riskScoreNorm: 78,
          asset: {
            name: 'Intune / SCCM content distribution',
            owner: 'endpoint-engineering',
            vendor: 'Microsoft',
            model: 'Configuration Manager distribution point',
            environment: 'management',
          },
        }),
        buildUserEntity({
          runMarker,
          subType: 'intune_admin',
          criticality: 'low_impact',
          riskLevel: 'Moderate',
          riskScoreNorm: 41,
        }),
      ];
