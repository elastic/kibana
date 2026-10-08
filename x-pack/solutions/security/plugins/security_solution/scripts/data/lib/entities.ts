/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';

export type AssetCriticality = 'low_impact' | 'medium_impact' | 'high_impact' | 'extreme_impact';

export interface CatalogHost {
  name: string;
  hostname: string;
  id: string;
  ip: string[];
  mac?: string[];
  os: { name: string; platform: string; type?: string; family?: string; kernel?: string };
  architecture?: string;
  type?: string;
  domain?: string;
  asset: {
    criticality: AssetCriticality;
    environment: string;
    business_unit: string;
    owner: string;
  };
  risky?: boolean;
}

export interface CatalogUser {
  name: string;
  email?: string;
  full_name?: string;
  id?: string;
  domain?: string;
  roles?: string[];
  asset: {
    criticality: AssetCriticality;
    business_unit: string;
  };
  risky?: boolean;
}

/** Curated synthetic hosts for graph + entity enrichment. */
export const HOSTS: Record<string, CatalogHost> = {
  'WIN-ANALYST01': {
    name: 'WIN-ANALYST01',
    hostname: 'WIN-ANALYST01',
    id: 'host-win-analyst01',
    ip: ['10.0.1.45'],
    mac: ['00:50:56:A1:01:01'],
    os: { name: 'Windows 11', platform: 'windows', type: 'windows' },
    architecture: 'x86_64',
    type: 'workstation',
    domain: 'CORP',
    asset: {
      criticality: 'medium_impact',
      environment: 'production',
      business_unit: 'Security',
      owner: 'jsmith',
    },
    risky: true,
  },
  'DC-CORP01': {
    name: 'DC-CORP01',
    hostname: 'DC-CORP01',
    id: 'host-dc-corp01',
    ip: ['10.0.0.1'],
    mac: ['00:50:56:A1:DC:01'],
    os: { name: 'Windows Server 2022', platform: 'windows', type: 'windows' },
    architecture: 'x86_64',
    type: 'server',
    domain: 'CORP',
    asset: {
      criticality: 'extreme_impact',
      environment: 'production',
      business_unit: 'IT',
      owner: 'it-infra',
    },
    risky: true,
  },
  'WKSTN-RECV01': {
    name: 'WKSTN-RECV01',
    hostname: 'WKSTN-RECV01',
    id: 'host-wkstn-recv01',
    ip: ['10.0.1.100'],
    mac: ['00:50:56:A1:02:01'],
    os: { name: 'Windows 11', platform: 'windows', type: 'windows' },
    architecture: 'x86_64',
    type: 'workstation',
    domain: 'CORP',
    asset: {
      criticality: 'medium_impact',
      environment: 'production',
      business_unit: 'Finance',
      owner: 'r.martinez',
    },
    risky: true,
  },
  'SRV-FILE01': {
    name: 'SRV-FILE01',
    hostname: 'SRV-FILE01',
    id: 'host-srv-file01',
    ip: ['10.0.0.10'],
    mac: ['00:50:56:A1:F1:01'],
    os: { name: 'Windows Server 2022', platform: 'windows', type: 'windows' },
    architecture: 'x86_64',
    type: 'server',
    domain: 'CORP',
    asset: {
      criticality: 'high_impact',
      environment: 'production',
      business_unit: 'IT',
      owner: 'it-infra',
    },
  },
  'DEV-BUILD03': {
    name: 'DEV-BUILD03',
    hostname: 'DEV-BUILD03',
    id: 'host-dev-build03',
    ip: ['10.0.4.30'],
    mac: ['00:50:56:A1:DB:03'],
    os: { name: 'Windows 11', platform: 'windows', type: 'windows' },
    architecture: 'x86_64',
    type: 'workstation',
    domain: 'CORP',
    asset: {
      criticality: 'low_impact',
      environment: 'development',
      business_unit: 'Engineering',
      owner: 'j.ops',
    },
  },
  'ci-runner-03': {
    name: 'ci-runner-03',
    hostname: 'ci-runner-03',
    id: 'host-ci-runner-03',
    ip: ['10.0.8.3'],
    os: { name: 'Ubuntu 22.04', platform: 'linux', type: 'linux', kernel: '5.15.0-89-generic' },
    architecture: 'x86_64',
    type: 'server',
    asset: {
      criticality: 'low_impact',
      environment: 'development',
      business_unit: 'Engineering',
      owner: 'platform-team',
    },
  },
  'LAPTOP-FIN03': {
    name: 'LAPTOP-FIN03',
    hostname: 'LAPTOP-FIN03',
    id: 'host-laptop-fin03',
    ip: ['10.0.3.50'],
    mac: ['00:50:56:A1:FN:03'],
    os: { name: 'Windows 11', platform: 'windows', type: 'windows' },
    architecture: 'x86_64',
    type: 'workstation',
    domain: 'ACME',
    asset: {
      criticality: 'high_impact',
      environment: 'production',
      business_unit: 'Finance',
      owner: 'alex.chen',
    },
  },
  'ADMIN-WS02': {
    name: 'ADMIN-WS02',
    hostname: 'ADMIN-WS02',
    id: 'host-admin-ws02',
    ip: ['10.0.1.202'],
    mac: ['00:50:56:A1:AW:02'],
    os: { name: 'Windows 11', platform: 'windows', type: 'windows' },
    architecture: 'x86_64',
    type: 'workstation',
    domain: 'CORP',
    asset: {
      criticality: 'high_impact',
      environment: 'production',
      business_unit: 'IT',
      owner: 'it.admin',
    },
  },
};

/** Curated synthetic users for graph + entity enrichment. */
export const USERS: Record<string, CatalogUser> = {
  jsmith: {
    name: 'jsmith',
    email: 'jsmith@corp.example',
    full_name: 'John Smith',
    id: 'S-1-5-21-1001',
    domain: 'CORP',
    roles: ['security-analyst'],
    asset: { criticality: 'high_impact', business_unit: 'Security' },
    risky: true,
  },
  'r.martinez': {
    name: 'r.martinez',
    email: 'r.martinez@corp.example',
    full_name: 'Rosa Martinez',
    id: 'S-1-5-21-1002',
    domain: 'CORP',
    roles: ['finance-user'],
    asset: { criticality: 'medium_impact', business_unit: 'Finance' },
    risky: true,
  },
  admin_svc: {
    name: 'admin_svc',
    email: 'admin_svc@corp.example',
    full_name: 'Admin Service Account',
    id: 'S-1-5-21-9001',
    domain: 'CORP',
    roles: ['domain-admin', 'service-account'],
    asset: { criticality: 'extreme_impact', business_unit: 'IT' },
    risky: true,
  },
  'dev-user': {
    name: 'dev-user',
    email: 'dev-user@corp.example',
    full_name: 'Dev User',
    id: 'AIDA1234567890',
    roles: ['developer'],
    asset: { criticality: 'medium_impact', business_unit: 'Engineering' },
  },
  'j.ops': {
    name: 'j.ops',
    email: 'j.ops@corp.example',
    full_name: 'Jordan Ops',
    id: 'S-1-5-21-3002',
    domain: 'CORP',
    roles: ['developer', 'devops'],
    asset: { criticality: 'medium_impact', business_unit: 'Engineering' },
  },
  'it.admin': {
    name: 'it.admin',
    email: 'it.admin@corp.example',
    full_name: 'IT Administrator',
    id: 'S-1-5-21-3003',
    domain: 'CORP',
    roles: ['it-admin', 'domain-admin'],
    asset: { criticality: 'high_impact', business_unit: 'IT' },
  },
  'alex.chen': {
    name: 'alex.chen',
    email: 'alex.chen@corp.example',
    full_name: 'Alex Chen',
    id: 'uid-alex-chen-001',
    roles: ['finance-analyst'],
    asset: { criticality: 'high_impact', business_unit: 'Finance' },
  },
  'helpdesk@corp.example': {
    name: 'helpdesk@corp.example',
    email: 'helpdesk@corp.example',
    full_name: 'IT Helpdesk',
    id: 'okta-uid-helpdesk',
    roles: ['helpdesk', 'it-support'],
    asset: { criticality: 'medium_impact', business_unit: 'IT' },
  },
};

const hashToUnitFloat = (input: string): number => {
  const h = crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
  return Number.parseInt(h, 16) / 0xffffffff;
};

const catalogHosts = (): CatalogHost[] => Object.values(HOSTS);
const catalogUsers = (): CatalogUser[] => Object.values(USERS);

export const pickHostPool = ({
  count,
  seed,
  riskyCount,
}: {
  count: number;
  seed: string;
  riskyCount: number;
}): CatalogHost[] => {
  const risky = catalogHosts().filter((h) => h.risky);
  const noise = catalogHosts().filter((h) => !h.risky);
  const out: CatalogHost[] = [];
  const take = (pool: CatalogHost[], n: number, salt: string) => {
    for (let i = 0; i < n && out.length < count; i++) {
      const idx = Math.floor(hashToUnitFloat(`${seed}:${salt}:${i}`) * pool.length) % pool.length;
      const candidate = pool[idx];
      if (!out.some((h) => h.name === candidate.name)) out.push(candidate);
    }
  };
  take(risky, Math.min(riskyCount, count), 'risky');
  take(noise.length > 0 ? noise : catalogHosts(), count, 'noise');
  while (out.length < count) {
    const idx = out.length;
    out.push({
      name: `host-gen-${idx + 1}`,
      hostname: `host-gen-${idx + 1}`,
      id: `host-gen-${idx + 1}`,
      ip: [`192.0.2.${(idx % 200) + 1}`],
      os: { name: 'Unknown', platform: 'unknown' },
      asset: {
        criticality: 'low_impact',
        environment: 'development',
        business_unit: 'Engineering',
        owner: 'platform-team',
      },
    });
  }
  return out.slice(0, count);
};

export const pickUserPool = ({
  count,
  seed,
  riskyCount,
}: {
  count: number;
  seed: string;
  riskyCount: number;
}): CatalogUser[] => {
  const risky = catalogUsers().filter((u) => u.risky);
  const noise = catalogUsers().filter((u) => !u.risky);
  const out: CatalogUser[] = [];
  const take = (pool: CatalogUser[], n: number, salt: string) => {
    for (let i = 0; i < n && out.length < count; i++) {
      const idx = Math.floor(hashToUnitFloat(`${seed}:${salt}:${i}`) * pool.length) % pool.length;
      const candidate = pool[idx];
      if (!out.some((u) => u.name === candidate.name)) out.push(candidate);
    }
  };
  take(risky, Math.min(riskyCount, count), 'risky');
  take(noise.length > 0 ? noise : catalogUsers(), count, 'noise');
  while (out.length < count) {
    const idx = out.length;
    out.push({
      name: `user-gen-${idx + 1}`,
      email: `user-gen-${idx + 1}@corp.example`,
      full_name: `Generated User ${idx + 1}`,
      id: `uid-gen-${idx + 1}`,
      asset: { criticality: 'low_impact', business_unit: 'Engineering' },
    });
  }
  return out.slice(0, count);
};

export const applyHostToDoc = (doc: Record<string, unknown>, host: CatalogHost): void => {
  doc.host = {
    ...(typeof doc.host === 'object' && doc.host !== null && !Array.isArray(doc.host)
      ? (doc.host as Record<string, unknown>)
      : {}),
    name: host.name,
    hostname: host.hostname,
    id: host.id,
    ip: host.ip,
    ...(host.mac ? { mac: host.mac } : {}),
    os: host.os,
    ...(host.architecture ? { architecture: host.architecture } : {}),
    ...(host.type ? { type: host.type } : {}),
    ...(host.domain ? { domain: host.domain } : {}),
    asset: host.asset,
  };
};

export const applyUserToDoc = (doc: Record<string, unknown>, user: CatalogUser): void => {
  doc.user = {
    ...(typeof doc.user === 'object' && doc.user !== null && !Array.isArray(doc.user)
      ? (doc.user as Record<string, unknown>)
      : {}),
    name: user.name,
    ...(user.email ? { email: user.email } : {}),
    ...(user.full_name ? { full_name: user.full_name } : {}),
    ...(user.id ? { id: user.id } : {}),
    ...(user.domain ? { domain: user.domain } : {}),
    ...(user.roles ? { roles: user.roles } : {}),
    asset: user.asset,
  };
};
