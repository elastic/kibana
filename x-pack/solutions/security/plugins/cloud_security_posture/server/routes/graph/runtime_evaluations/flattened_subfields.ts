/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface FlattenedSubfieldRead {
  readonly root: string;
  readonly dottedPath: string;
  readonly key: string;
}

/**
 * Keys of `flattened` fields that integration evaluations read with
 * `COALESCE(<dottedPath>, FIELD_EXTRACT(<root>, "<key>"))`. See NULLIFY_WORKAROUNDS.md.
 */
export const FLATTENED_SUBFIELD_READS: readonly FlattenedSubfieldRead[] = [
  {
    root: 'm365_defender.event.additional_fields',
    dottedPath: 'm365_defender.event.additional_fields.SourceAccountSid',
    key: 'SourceAccountSid',
  },
  {
    root: 'm365_defender.event.additional_fields',
    dottedPath: 'm365_defender.event.additional_fields.DestinationComputerObjectGuid',
    key: 'DestinationComputerObjectGuid',
  },
  {
    root: 'snyk.audit_logs.content',
    dottedPath: 'snyk.audit_logs.content.email',
    key: 'email',
  },
  {
    root: 'snyk.audit_logs.content',
    dottedPath: 'snyk.audit_logs.content.targetId',
    key: 'targetId',
  },
  {
    root: 'snyk.audit_logs.content',
    dottedPath: 'snyk.audit_logs.content.serviceAccountPublicId',
    key: 'serviceAccountPublicId',
  },
  {
    root: 'greenhouse.audit.event.meta',
    dottedPath: 'greenhouse.audit.event.meta.name',
    key: 'name',
  },
  {
    root: '`cisco_meraki.8021x_eap_success`',
    dottedPath: '`cisco_meraki.8021x_eap_success.vap`',
    key: 'vap',
  },
  {
    root: 'cisco_meraki.wpa_auth',
    dottedPath: 'cisco_meraki.wpa_auth.vap',
    key: 'vap',
  },
  {
    root: 'cisco_meraki.splash_auth',
    dottedPath: 'cisco_meraki.splash_auth.vap',
    key: 'vap',
  },
];

const FLATTENED_ROOT_NAMES: ReadonlySet<string> = new Set(
  FLATTENED_SUBFIELD_READS.map(({ root }) => root.replace(/`/g, ''))
);

const AMBIGUOUS_FIELD_PATTERN = /Cannot use field \[([^\]]+)\] due to ambiguities/g;

/** Replaces each `COALESCE`/`FIELD_EXTRACT` read of a flattened key with its dotted path alone. */
export const withoutFieldExtract = (esql: string): string =>
  FLATTENED_SUBFIELD_READS.reduce(
    (query, { root, dottedPath, key }) =>
      query.replaceAll(`COALESCE(${dottedPath}, FIELD_EXTRACT(${root}, "${key}"))`, dottedPath),
    esql
  );

/**
 * Whether ES|QL rejected the query because the queried indices map a flattened root with
 * incompatible types (`flattened` in one index, an object in another).
 */
export const isFlattenedRootAmbiguityError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return [...message.matchAll(AMBIGUOUS_FIELD_PATTERN)].some(([, field]) =>
    FLATTENED_ROOT_NAMES.has(field)
  );
};
