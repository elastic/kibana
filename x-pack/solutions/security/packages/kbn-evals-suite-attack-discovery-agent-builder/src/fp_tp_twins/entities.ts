/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENCODED_POWERSHELL_HOST,
  ENCODED_POWERSHELL_HOST_ENTITY_ID,
  ENCODED_POWERSHELL_HOST_ID,
  ENCODED_POWERSHELL_USER,
  ENCODED_POWERSHELL_USER_ENTITY_ID,
  FP_TP_BASE_TIME,
  FP_TP_ENTITY_INDEX,
  FP_TP_TWIN_SEED_LABEL,
} from './constants';
import type { FpTpIndexedEntity, FpTpTwinVariant } from './types';

const timestamp = FP_TP_BASE_TIME.toISOString().replace(/\.\d{3}Z$/, '.000Z');

const hostFields = {
  name: ENCODED_POWERSHELL_HOST,
  hostname: ENCODED_POWERSHELL_HOST,
  id: ENCODED_POWERSHELL_HOST_ID,
  os: { type: 'windows', name: 'Windows', version: 'test' },
};

const buildHostEntity = ({
  variant,
  subType,
  criticality,
  riskLevel,
  riskScoreNorm,
  asset,
}: {
  variant: FpTpTwinVariant;
  subType: string;
  criticality: string;
  riskLevel: string;
  riskScoreNorm: number;
  asset: Record<string, unknown>;
}): FpTpIndexedEntity => ({
  index: FP_TP_ENTITY_INDEX,
  id: ENCODED_POWERSHELL_HOST_ENTITY_ID,
  source: {
    '@timestamp': timestamp,
    labels: {
      ad_fp_tp_twin: `encoded-powershell.${variant}`,
      ad_portable_seed: FP_TP_TWIN_SEED_LABEL,
    },
    host: hostFields,
    asset: { ...asset, criticality },
    entity: {
      id: ENCODED_POWERSHELL_HOST_ENTITY_ID,
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
});

const buildUserEntity = ({
  variant,
  subType,
  criticality,
  riskLevel,
  riskScoreNorm,
}: {
  variant: FpTpTwinVariant;
  subType: string;
  criticality: string;
  riskLevel: string;
  riskScoreNorm: number;
}): FpTpIndexedEntity => ({
  index: FP_TP_ENTITY_INDEX,
  id: ENCODED_POWERSHELL_USER_ENTITY_ID,
  source: {
    '@timestamp': timestamp,
    labels: {
      ad_fp_tp_twin: `encoded-powershell.${variant}`,
      ad_portable_seed: FP_TP_TWIN_SEED_LABEL,
    },
    user: { name: ENCODED_POWERSHELL_USER, domain: 'CONTOSO' },
    host: { name: ENCODED_POWERSHELL_HOST, id: ENCODED_POWERSHELL_HOST_ID },
    asset: { criticality },
    entity: {
      id: ENCODED_POWERSHELL_USER_ENTITY_ID,
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
});

export const ENCODED_POWERSHELL_TP_ENTITIES: readonly FpTpIndexedEntity[] = [
  buildHostEntity({
    variant: 'tp',
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
    variant: 'tp',
    subType: 'employee',
    criticality: 'medium_impact',
    riskLevel: 'Low',
    riskScoreNorm: 12,
  }),
];

export const ENCODED_POWERSHELL_FP_ENTITIES: readonly FpTpIndexedEntity[] = [
  buildHostEntity({
    variant: 'fp',
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
    variant: 'fp',
    subType: 'intune_admin',
    criticality: 'low_impact',
    riskLevel: 'Moderate',
    riskScoreNorm: 41,
  }),
];
