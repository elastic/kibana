/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fields available on an Entity Store entity document, mirrored from the real
 * engine definitions so the prototype's control editor offers a realistic
 * field list:
 *
 *   x-pack/solutions/security/plugins/entity_store/common/domain/definitions/
 *     common_fields.ts | host.ts | user.ts | service.ts | generic.ts
 *
 * Only the five fields flagged with `facet` are backed by prototype mock data;
 * every other field renders a control with no options.
 */

import type { FilterFacetCounts } from './filter_facet_counts';

/** The prototype's mock-backed facets, i.e. the ones with real option values. */
export type FilterFacet = keyof FilterFacetCounts;

export interface EntityStoreField {
  name: string;
  /** DataView-style type, drives the field icon. */
  type: 'string' | 'number' | 'date' | 'boolean' | 'ip';
  /** Underlying Elasticsearch type. */
  esType: string;
  /** Set when the prototype has mock values for this field. */
  facet?: FilterFacet;
}

const keyword = (name: string, facet?: FilterFacet): EntityStoreField => ({
  name,
  type: 'string',
  esType: 'keyword',
  facet,
});

const ip = (name: string): EntityStoreField => ({ name, type: 'ip', esType: 'ip' });
const date = (name: string): EntityStoreField => ({ name, type: 'date', esType: 'date' });
const bool = (name: string): EntityStoreField => ({ name, type: 'boolean', esType: 'boolean' });
const num = (name: string, esType = 'long'): EntityStoreField => ({ name, type: 'number', esType });

/** Shared across every entity type. */
const COMMON_FIELDS: EntityStoreField[] = [
  date('@timestamp'),
  date('event.ingested'),
  keyword('tags'),
  keyword('entity.id'),
  keyword('entity.name'),
  keyword('entity.type', 'entityTypes'),
  keyword('entity.sub_type'),
  keyword('entity.source', 'sources'),
  keyword('entity.url'),
  keyword('entity.EngineMetadata.Type'),
  keyword('entity.EngineMetadata.UntypedId'),
  keyword('event.module'),
  keyword('event.dataset'),
  keyword('data_stream.dataset'),
  keyword('entity.risk.calculated_level', 'riskLevels'),
  num('entity.risk.calculated_score', 'float'),
  num('entity.risk.calculated_score_norm', 'float'),
  keyword('asset.id'),
  keyword('asset.name'),
  keyword('asset.owner'),
  keyword('asset.serial_number'),
  keyword('asset.model'),
  keyword('asset.vendor'),
  keyword('asset.environment'),
  keyword('asset.criticality', 'criticalities'),
  keyword('asset.business_unit'),
  keyword('entity.attributes.watchlists', 'watchlists'),
  bool('entity.attributes.asset'),
  bool('entity.attributes.managed'),
  bool('entity.attributes.mfa_enabled'),
  keyword('entity.attributes.storage_class'),
  keyword('entity.attributes.permissions'),
  keyword('entity.attributes.known_redirects'),
  keyword('entity.attributes.oauth_consent_restriction'),
  date('entity.lifecycle.first_seen'),
  date('entity.lifecycle.last_seen'),
  date('entity.lifecycle.last_activity'),
  keyword('entity.behaviors.rule_names'),
  keyword('entity.behaviors.anomaly_job_ids'),
  keyword('entity.relationships.resolution.resolved_to'),
  keyword('entity.relationships.resolution.risk.calculated_level'),
  num('entity.relationships.resolution.risk.calculated_score', 'float'),
  num('entity.relationships.resolution.risk.calculated_score_norm', 'float'),
];

/** `ENTITY_RELATIONSHIP_COLLECT_LEAVES` in the engine's common_fields.ts. */
const RELATIONSHIPS = [
  'administers',
  'communicates_with',
  'depends_on',
  'owns_inferred',
  'accesses_infrequently',
  'accesses_frequently',
  'owns',
  'supervises',
];

const RELATIONSHIP_FIELDS: EntityStoreField[] = RELATIONSHIPS.flatMap((relationship) =>
  [
    'ids',
    'raw_identifiers.entity.id',
    'raw_identifiers.host.id',
    'raw_identifiers.host.name',
    'raw_identifiers.user.id',
    'raw_identifiers.user.name',
    'raw_identifiers.user.email',
    'raw_identifiers.service.name',
  ].map((leaf) => keyword(`entity.relationships.${relationship}.${leaf}`))
);

const HOST_FIELDS: EntityStoreField[] = [
  keyword('host.entity.id'),
  keyword('host.name'),
  keyword('host.domain'),
  keyword('host.hostname'),
  keyword('host.id'),
  keyword('host.type'),
  keyword('host.architecture'),
  keyword('host.boot.id'),
  keyword('host.mac'),
  ip('host.ip'),
  keyword('host.os.name'),
  keyword('host.os.type'),
  keyword('host.os.family'),
  keyword('host.os.full'),
  keyword('host.os.kernel'),
  keyword('host.os.platform'),
  keyword('host.os.version'),
  num('host.cpu.usage', 'scaled_float'),
  num('host.disk.read.bytes'),
  num('host.disk.write.bytes'),
  num('host.network.egress.bytes'),
  num('host.network.egress.packets'),
  num('host.network.ingress.bytes'),
  num('host.network.ingress.packets'),
  num('host.uptime'),
  keyword('host.pid_ns_ino'),
  keyword('host.geo.city_name'),
  keyword('host.geo.continent_code'),
  keyword('host.geo.continent_name'),
  keyword('host.geo.country_iso_code'),
  keyword('host.geo.country_name'),
  keyword('host.geo.name'),
  keyword('host.geo.postal_code'),
  keyword('host.geo.region_iso_code'),
  keyword('host.geo.region_name'),
  keyword('host.geo.timezone'),
  keyword('agent.id'),
  keyword('agent.type'),
  keyword('endpoint.id'),
];

const USER_FIELDS: EntityStoreField[] = [
  keyword('entity.namespace'),
  keyword('entity.confidence'),
  keyword('user.name'),
  keyword('user.id'),
  keyword('user.domain'),
  keyword('user.email'),
  keyword('user.full_name'),
  keyword('user.hash'),
  keyword('user.roles'),
  keyword('user.group.domain'),
  keyword('user.group.id'),
  keyword('user.group.name'),
  keyword('event.kind'),
  keyword('event.category'),
  keyword('event.type'),
  keyword('event.outcome'),
];

const SERVICE_FIELDS: EntityStoreField[] = [
  keyword('service.entity.id'),
  keyword('service.name'),
  keyword('service.address'),
  keyword('service.environment'),
  keyword('service.ephemeral_id'),
  keyword('service.id'),
  keyword('service.node.name'),
  keyword('service.node.role'),
  keyword('service.node.roles'),
  keyword('service.state'),
  keyword('service.type'),
  keyword('service.version'),
];

const GENERIC_FIELDS: EntityStoreField[] = [
  keyword('cloud.provider'),
  keyword('cloud.region'),
  keyword('cloud.availability_zone'),
  keyword('cloud.account.id'),
  keyword('cloud.account.name'),
  keyword('cloud.instance.id'),
  keyword('cloud.instance.name'),
  keyword('cloud.machine.type'),
  keyword('cloud.project.id'),
  keyword('cloud.project.name'),
  keyword('cloud.service.name'),
  keyword('orchestrator.api_version'),
  keyword('orchestrator.cluster.id'),
  keyword('orchestrator.cluster.name'),
  keyword('orchestrator.cluster.url'),
  keyword('orchestrator.cluster.version'),
  keyword('orchestrator.namespace'),
  keyword('orchestrator.organization'),
  keyword('orchestrator.type'),
  keyword('orchestrator.resource.annotation'),
  keyword('orchestrator.resource.id'),
  ip('orchestrator.resource.ip'),
  keyword('orchestrator.resource.label'),
  keyword('orchestrator.resource.name'),
  keyword('orchestrator.resource.parent.type'),
  keyword('orchestrator.resource.type'),
];

/** Union of every entity type, deduplicated and sorted like the real picker. */
export const ENTITY_STORE_FIELDS: EntityStoreField[] = Object.values(
  [
    ...COMMON_FIELDS,
    ...RELATIONSHIP_FIELDS,
    ...HOST_FIELDS,
    ...USER_FIELDS,
    ...SERVICE_FIELDS,
    ...GENERIC_FIELDS,
  ].reduce<Record<string, EntityStoreField>>((acc, field) => {
    acc[field.name] = acc[field.name] ?? field;
    return acc;
  }, {})
).sort((a, b) => a.name.localeCompare(b.name));

const FIELDS_BY_NAME = new Map(ENTITY_STORE_FIELDS.map((field) => [field.name, field]));

export const getEntityStoreField = (name: string): EntityStoreField | undefined =>
  FIELDS_BY_NAME.get(name);

/** The prototype's mock-backed facet for a field, when one exists. */
export const getFieldFacet = (name: string): FilterFacet | undefined =>
  FIELDS_BY_NAME.get(name)?.facet;
