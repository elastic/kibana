/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BlindSpotGap,
  BlindSpotGroup,
  BlindSpotSignalId,
  AttackStagesSummary,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { EvidenceRegistry } from '../snapshot/evidence_registry';
import {
  APP_LINKS,
  AD_STALE_DAYS,
  LEADS_STALE_DAYS,
  MS_PER_DAY,
  MS_PER_HOUR,
  RISK_ENGINE_STALE_HOURS,
  UNATTRIBUTED_ALERT_GAP_MIN_SHARE,
  UNMAPPED_ALERT_GAP_MIN_SHARE,
} from './constants';

// ---------------------------------------------------------------------------------------------
// Inputs (plain data read by gap_data.ts so each signal stays a small pure function)
// ---------------------------------------------------------------------------------------------

export type RelationshipSourceKind = 'idp' | 'logon' | 'cloud' | 'edr' | 'mdm' | 'hr';

export interface RelationshipSource {
  id: string;
  kind: RelationshipSourceKind;
  label: string;
  /** Fleet package, used for the fix-it link. */
  pkg: string;
  /** Index pattern the maintainers read. */
  pattern: string;
}

export interface EntityDocSummary {
  euid: string;
  /** Golden euid this doc is an alias of, if any. */
  resolvedTo?: string;
  hasRelationships: boolean;
  /** Entity ids this doc points at through any `entity.relationships.<kind>.ids`. */
  relationshipTargets?: string[];
  criticality?: string;
}

export interface EntityDocsResult {
  indexExists: boolean;
  docs: EntityDocSummary[];
}

export interface StorylineEntityContext {
  storylineEuids: readonly string[];
  materialRiskEuids: readonly string[];
  entities: EntityDocsResult;
}

export interface UnresolvedUsers {
  total: number;
  /** Storyline entities that are unresolved local users. */
  storylineEuids: string[];
}

export interface UnattributedAlerts {
  total: number;
  unattributed: number;
}

export interface AttackDiscoveryStatus {
  lastTimestamp?: string;
  enabledSchedules: number;
}

export interface LeadsStatus {
  indexExists: boolean;
  total: number;
  lastRun?: string;
}

export interface RiskEngineStatus {
  taskStatus?: 'never_started' | 'started' | 'stopped';
  lastSuccessTimestamp?: string | null;
}

export interface MlStatus {
  /** `ml` plugin is available at all. */
  mlAvailable: boolean;
  jobsInstalled: number;
  jobsOpened: number;
}

export interface UncasedAlerts {
  total: number;
  critical: number;
  /** Alias and golden euids from alerts, as found on the alert docs. */
  entityIds: string[];
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const SEVERITY_ORDER: Record<BlindSpotGap['severity'], number> = { danger: 0, warning: 1, info: 2 };

const makeGap = (
  registry: EvidenceRegistry,
  signal: BlindSpotSignalId,
  group: BlindSpotGroup,
  severity: BlindSpotGap['severity'],
  rest: Omit<BlindSpotGap, 'evidenceId' | 'signal' | 'group' | 'severity'>
): BlindSpotGap => ({
  evidenceId: registry.gap(signal),
  signal,
  group,
  severity,
  ...rest,
});

const plural = (count: number, singular: string, pluralForm: string): string =>
  count === 1 ? singular : pluralForm;

const ageMs = (timestamp: string | null | undefined, nowIso: string): number | undefined => {
  if (!timestamp) return undefined;
  const then = Date.parse(timestamp);
  if (Number.isNaN(then)) return undefined;
  return Date.parse(nowIso) - then;
};

const toPercent = (share: number): number => Math.round(share * 100);

/** Danger first, then warning, then info; ties by signal number. */
export const sortGaps = (gaps: readonly BlindSpotGap[]): BlindSpotGap[] =>
  [...gaps].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      Number(a.signal.slice(1)) - Number(b.signal.slice(1))
  );

/** Golden euid -> docs that are the golden doc or one of its aliases. */
const groupByGolden = (
  euids: readonly string[],
  docs: readonly EntityDocSummary[]
): Map<string, EntityDocSummary[]> => {
  const grouped = new Map<string, EntityDocSummary[]>(euids.map((euid) => [euid, []]));
  for (const doc of docs) {
    const golden = doc.resolvedTo && grouped.has(doc.resolvedTo) ? doc.resolvedTo : doc.euid;
    grouped.get(golden)?.push(doc);
  }
  return grouped;
};

// ---------------------------------------------------------------------------------------------
// B1 relationship source integrations missing
// ---------------------------------------------------------------------------------------------

export const RELATIONSHIP_SOURCES: readonly RelationshipSource[] = [
  {
    id: 'okta',
    kind: 'idp',
    label: 'Okta',
    pkg: 'entityanalytics_okta',
    pattern: 'logs-entityanalytics_okta.*',
  },
  {
    // The Okta system log integration is the common source of Okta identity data.
    id: 'okta_system',
    kind: 'idp',
    label: 'Okta (system logs)',
    pkg: 'okta',
    pattern: 'logs-okta.system-*',
  },
  {
    id: 'entra_id',
    kind: 'idp',
    label: 'Microsoft Entra ID',
    pkg: 'entityanalytics_entra_id',
    pattern: 'logs-entityanalytics_entra_id.*',
  },
  {
    id: 'active_directory',
    kind: 'idp',
    label: 'Active Directory',
    pkg: 'entityanalytics_ad',
    pattern: 'logs-entityanalytics_ad.*',
  },
  {
    id: 'endpoint',
    kind: 'logon',
    label: 'Elastic Defend',
    pkg: 'endpoint',
    pattern: 'logs-endpoint.events.security-*',
  },
  {
    id: 'system_auth',
    kind: 'logon',
    label: 'System (auth)',
    pkg: 'system',
    pattern: 'logs-system.auth-*',
  },
  {
    id: 'system_security',
    kind: 'logon',
    label: 'System (security)',
    pkg: 'system',
    pattern: 'logs-system.security-*',
  },
  {
    id: 'cloudtrail',
    kind: 'cloud',
    label: 'AWS CloudTrail',
    pkg: 'aws',
    pattern: 'logs-aws.cloudtrail-*',
  },
  {
    id: 'crowdstrike',
    kind: 'edr',
    label: 'CrowdStrike',
    pkg: 'crowdstrike',
    pattern: 'logs-crowdstrike.fdr-*',
  },
  {
    id: 'jamf',
    kind: 'mdm',
    label: 'Jamf Pro',
    pkg: 'jamf_pro',
    pattern: 'logs-jamf_pro.events-*',
  },
  {
    id: 'workday',
    kind: 'hr',
    label: 'Workday',
    pkg: 'workday',
    pattern: 'logs-workday.user-*',
  },
];

/** Raised when there is no IdP inventory or no logon data, since relationships need both. */
export const buildGapB1 = (
  registry: EvidenceRegistry,
  presentSourceIds: ReadonlySet<string>
): BlindSpotGap | undefined => {
  const missing = RELATIONSHIP_SOURCES.filter(({ id }) => !presentSourceIds.has(id));
  const noIdp = RELATIONSHIP_SOURCES.filter(({ kind }) => kind === 'idp').every(
    ({ id }) => !presentSourceIds.has(id)
  );
  const noLogon = RELATIONSHIP_SOURCES.filter(({ kind }) => kind === 'logon').every(
    ({ id }) => !presentSourceIds.has(id)
  );
  if (!noIdp && !noLogon) return undefined;

  const parts = [
    ...(noIdp ? ['no IdP inventory (Okta/Entra/AD)'] : []),
    ...(noLogon ? ['no logon data (Elastic Defend or System)'] : []),
  ];
  const fixPackage = noIdp ? 'entityanalytics_okta' : 'system';
  return makeGap(registry, 'B1', 'data_not_collected', 'warning', {
    title: `Relationships unavailable: ${parts.join(' and ')}`,
    value: missing.length,
    detail: `Missing sources: ${missing.map(({ label }) => label).join(', ')}`,
    fixHref: APP_LINKS.integration(fixPackage),
    fixLabel: 'Add integration',
  });
};

// ---------------------------------------------------------------------------------------------
// B4 storyline entities with no relationships
// ---------------------------------------------------------------------------------------------

export const buildGapB4 = (
  registry: EvidenceRegistry,
  { storylineEuids, entities }: StorylineEntityContext
): BlindSpotGap | undefined => {
  if (storylineEuids.length === 0 || !entities.indexExists) return undefined;
  const grouped = groupByGolden(storylineEuids, entities.docs);
  // Hosts usually only appear as the target of a user's access / communication relationship.
  const targets = new Set(entities.docs.flatMap((doc) => doc.relationshipTargets ?? []));
  const without = storylineEuids.filter((euid) => {
    const group = grouped.get(euid) ?? [];
    return !group.some(({ euid: id, hasRelationships }) => hasRelationships || targets.has(id));
  });
  if (without.length === 0) return undefined;
  return makeGap(registry, 'B4', 'attribution_gap', 'info', {
    title: `${without.length} storyline ${plural(
      without.length,
      'entity has',
      'entities have'
    )} no known relationships`,
    value: without.length,
    fixHref: APP_LINKS.integration('entityanalytics_okta'),
    fixLabel: 'Add relationship sources',
    entityEuids: [...without],
  });
};

// ---------------------------------------------------------------------------------------------
// B5 unresolved identities
// ---------------------------------------------------------------------------------------------

export const buildGapB5 = (
  registry: EvidenceRegistry,
  unresolved: UnresolvedUsers
): BlindSpotGap | undefined => {
  if (unresolved.total <= 0) return undefined;
  return makeGap(registry, 'B5', 'context_missing', 'info', {
    title: `${unresolved.total} local user ${plural(
      unresolved.total,
      'account is',
      'accounts are'
    )} not resolved to an identity`,
    value: unresolved.total,
    fixHref: APP_LINKS.entityStore,
    fixLabel: 'Review resolution',
    ...(unresolved.storylineEuids.length > 0 ? { entityEuids: unresolved.storylineEuids } : {}),
  });
};

// ---------------------------------------------------------------------------------------------
// B6 no asset criticality on material-risk entities
// ---------------------------------------------------------------------------------------------

export const buildGapB6 = (
  registry: EvidenceRegistry,
  { materialRiskEuids, entities }: StorylineEntityContext
): BlindSpotGap | undefined => {
  if (materialRiskEuids.length === 0 || !entities.indexExists) return undefined;
  const withCriticality = new Set(
    entities.docs.filter(({ criticality }) => !!criticality).map(({ euid }) => euid)
  );
  const without = materialRiskEuids.filter((euid) => !withCriticality.has(euid));
  if (without.length === 0) return undefined;
  return makeGap(registry, 'B6', 'context_missing', 'warning', {
    title: `No asset criticality on ${without.length} material-risk ${plural(
      without.length,
      'entity',
      'entities'
    )}`,
    value: without.length,
    fixHref: APP_LINKS.assetCriticality,
    fixLabel: 'Assign criticality',
    entityEuids: [...without],
  });
};

// ---------------------------------------------------------------------------------------------
// B8 alerts that cannot be attributed to an entity
// ---------------------------------------------------------------------------------------------

export const buildGapB8 = (
  registry: EvidenceRegistry,
  { total, unattributed }: UnattributedAlerts
): BlindSpotGap | undefined => {
  if (total <= 0) return undefined;
  const share = unattributed / total;
  if (share < UNATTRIBUTED_ALERT_GAP_MIN_SHARE) return undefined;
  const percent = toPercent(share);
  return makeGap(registry, 'B8', 'attribution_gap', 'warning', {
    title: `${percent}% of alerts cannot be attributed to an entity`,
    value: percent,
    detail: `${unattributed} of ${total} alerts have no host, user or service identity`,
    fixHref: APP_LINKS.rules,
    fixLabel: 'Review rules and data quality',
  });
};

// ---------------------------------------------------------------------------------------------
// B9 entity types not monitored
// ---------------------------------------------------------------------------------------------

const EXPECTED_ENTITY_TYPES = ['user', 'host', 'service'] as const;

export const buildGapB9 = (
  registry: EvidenceRegistry,
  entityTypes: { indexExists: boolean; types: ReadonlySet<string> }
): BlindSpotGap | undefined => {
  const missing = EXPECTED_ENTITY_TYPES.filter((type) => !entityTypes.types.has(type));
  if (missing.length === 0) return undefined;
  const nothingMonitored =
    !entityTypes.indexExists || missing.length === EXPECTED_ENTITY_TYPES.length;
  const onlyService = missing.length === 1 && missing[0] === 'service';
  return makeGap(registry, 'B9', 'data_not_collected', onlyService ? 'info' : 'warning', {
    title: nothingMonitored
      ? 'The Entity Store has no entities'
      : `Entity types not monitored: ${missing.join(', ')}`,
    value: missing.length,
    fixHref: APP_LINKS.entityStore,
    fixLabel: 'Set up the Entity Store',
  });
};

// ---------------------------------------------------------------------------------------------
// B10 Attack Discovery never run or stale
// ---------------------------------------------------------------------------------------------

export const buildGapB10 = (
  registry: EvidenceRegistry,
  status: AttackDiscoveryStatus,
  nowIso: string
): BlindSpotGap | undefined => {
  const fix = { fixHref: APP_LINKS.attackDiscovery, fixLabel: 'Open Attack Discovery' };
  const age = ageMs(status.lastTimestamp, nowIso);
  if (age === undefined) {
    return makeGap(registry, 'B10', 'analytics_not_running', 'warning', {
      title:
        status.enabledSchedules > 0
          ? 'Attack Discovery is scheduled but has not produced results yet'
          : 'Attack Discovery has never run',
      ...fix,
    });
  }
  const days = Math.floor(age / MS_PER_DAY);
  if (days >= AD_STALE_DAYS && status.enabledSchedules === 0) {
    return makeGap(registry, 'B10', 'analytics_not_running', 'info', {
      title: `Attack Discovery last ran ${days} days ago and is not scheduled`,
      value: days,
      ...fix,
    });
  }
  return undefined;
};

// ---------------------------------------------------------------------------------------------
// B11 hunting leads disabled or stale
// ---------------------------------------------------------------------------------------------

export const buildGapB11 = (
  registry: EvidenceRegistry,
  status: LeadsStatus,
  nowIso: string
): BlindSpotGap | undefined => {
  const fix = { fixHref: APP_LINKS.entityAnalyticsHome, fixLabel: 'Open hunting leads' };
  if (!status.indexExists || status.total === 0) {
    return makeGap(registry, 'B11', 'analytics_not_running', 'info', {
      title: 'No hunting leads have been generated',
      ...fix,
    });
  }
  const age = ageMs(status.lastRun, nowIso);
  if (age !== undefined && age >= LEADS_STALE_DAYS * MS_PER_DAY) {
    const days = Math.floor(age / MS_PER_DAY);
    return makeGap(registry, 'B11', 'analytics_not_running', 'info', {
      title: `Hunting leads were last generated ${days} days ago`,
      value: days,
      ...fix,
    });
  }
  return undefined;
};

// ---------------------------------------------------------------------------------------------
// B12 ML jobs not installed or not running
// ---------------------------------------------------------------------------------------------

export const buildGapB12 = (
  registry: EvidenceRegistry,
  { mlAvailable, jobsInstalled, jobsOpened }: MlStatus
): BlindSpotGap | undefined => {
  if (mlAvailable && jobsInstalled > 0 && jobsOpened > 0) return undefined;
  return makeGap(registry, 'B12', 'analytics_not_running', 'info', {
    title: 'No security ML jobs are running',
    ...(mlAvailable && jobsInstalled > 0
      ? {
          detail: `${jobsInstalled} security ML ${plural(
            jobsInstalled,
            'job is',
            'jobs are'
          )} installed but none is started`,
        }
      : {}),
    fixHref: APP_LINKS.mlJobs,
    fixLabel: 'Set up ML',
  });
};

// ---------------------------------------------------------------------------------------------
// B13 risk engine not running or stale
// ---------------------------------------------------------------------------------------------

export const buildGapB13 = (
  registry: EvidenceRegistry,
  status: RiskEngineStatus | undefined,
  nowIso: string
): BlindSpotGap | undefined => {
  const fix = { fixHref: APP_LINKS.entityAnalyticsManagement, fixLabel: 'Open risk engine' };
  if (!status || status.taskStatus !== 'started') {
    return makeGap(registry, 'B13', 'analytics_not_running', 'warning', {
      title: 'Risk scoring is not running',
      ...fix,
    });
  }
  const age = ageMs(status.lastSuccessTimestamp, nowIso);
  if (age === undefined || age >= RISK_ENGINE_STALE_HOURS * MS_PER_HOUR) {
    const hours = age === undefined ? undefined : Math.floor(age / MS_PER_HOUR);
    return makeGap(registry, 'B13', 'analytics_not_running', 'warning', {
      title:
        hours === undefined
          ? 'Risk scoring has not completed a run'
          : `Risk scores were last updated ${hours} hours ago`,
      ...(hours === undefined ? {} : { value: hours }),
      ...fix,
    });
  }
  return undefined;
};

// ---------------------------------------------------------------------------------------------
// B16 unmapped-tactic alert share
// ---------------------------------------------------------------------------------------------

export const buildGapB16 = (
  registry: EvidenceRegistry,
  unmapped: AttackStagesSummary['unmapped']
): BlindSpotGap | undefined => {
  if (unmapped.alerts <= 0 || unmapped.share < UNMAPPED_ALERT_GAP_MIN_SHARE) return undefined;
  const percent = toPercent(unmapped.share);
  return makeGap(registry, 'B16', 'detection_coverage', 'warning', {
    title: `${percent}% of alerts have no MITRE ATT&CK mapping`,
    value: percent,
    fixHref: APP_LINKS.coverageOverview,
    fixLabel: 'Review coverage',
  });
};

// ---------------------------------------------------------------------------------------------
// B17 response gap: open High/Critical alerts in storylines with no case
// ---------------------------------------------------------------------------------------------

export const buildGapB17 = (
  registry: EvidenceRegistry,
  uncased: UncasedAlerts,
  storylineEuids: readonly string[],
  docs: readonly EntityDocSummary[]
): BlindSpotGap | undefined => {
  if (uncased.total <= 0) return undefined;
  const grouped = groupByGolden(storylineEuids, docs);
  const affected = new Set(uncased.entityIds);
  const entityEuids = storylineEuids.filter((euid) =>
    [euid, ...(grouped.get(euid) ?? []).map((doc) => doc.euid)].some((id) => affected.has(id))
  );
  return makeGap(registry, 'B17', 'response_gap', uncased.critical > 0 ? 'danger' : 'warning', {
    title: `${uncased.total} open High/Critical ${plural(
      uncased.total,
      'alert',
      'alerts'
    )} in storylines ${plural(uncased.total, 'has', 'have')} no case`,
    value: uncased.total,
    fixHref: APP_LINKS.alerts,
    fixLabel: 'Review alerts',
    ...(entityEuids.length > 0 ? { entityEuids } : {}),
  });
};

// ---------------------------------------------------------------------------------------------
// Stubs (not part of the PoC): B2, B3, B7, B14, B15
// ---------------------------------------------------------------------------------------------

/** TODO: relationships present at all (per-kind entity counts). */
export const buildGapB2 = (): BlindSpotGap | undefined => undefined;
/** TODO: relationship maintainers not running, failing, or writing 0. */
export const buildGapB3 = (): BlindSpotGap | undefined => undefined;
/** TODO: privileged-user watchlist empty or unused. */
export const buildGapB7 = (): BlindSpotGap | undefined => undefined;
/** TODO: relationship history too short for "first seen". */
export const buildGapB14 = (): BlindSpotGap | undefined => undefined;
/** TODO: no vulnerability or posture data for storyline hosts. */
export const buildGapB15 = (): BlindSpotGap | undefined => undefined;
