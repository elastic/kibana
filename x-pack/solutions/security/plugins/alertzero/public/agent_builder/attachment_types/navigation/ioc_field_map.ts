/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const IP_IOC_FIELDS = ['source.ip', 'destination.ip', 'client.ip', 'server.ip'] as const;
const DOMAIN_IOC_FIELDS = ['dns.question.name', 'url.domain'] as const;
const URL_IOC_FIELDS = ['url.full', 'url.original'] as const;
const GENERIC_HASH_IOC_FIELDS = ['file.hash.sha256', 'file.hash.sha1', 'file.hash.md5'] as const;
// Align with security_solution threat-intel hunt field map for email IOCs in logs.
// Do not use email.from.address here: it is absent from typical logs-* mappings and
// ES|QL rejects the whole query with Unknown column when any WHERE field is unmapped.
const EMAIL_IOC_FIELDS = ['user.email', 'user.target.email'] as const;

const IOC_TYPE_TO_ESQL_FIELDS: Readonly<Record<string, readonly string[]>> = {
  'ipv4-addr': IP_IOC_FIELDS,
  'ipv6-addr': IP_IOC_FIELDS,
  ip: IP_IOC_FIELDS,
  'domain-name': DOMAIN_IOC_FIELDS,
  domain: DOMAIN_IOC_FIELDS,
  url: URL_IOC_FIELDS,
  'file-hash': GENERIC_HASH_IOC_FIELDS,
  hash: GENERIC_HASH_IOC_FIELDS,
  sha256: ['file.hash.sha256'],
  sha1: ['file.hash.sha1'],
  md5: ['file.hash.md5'],
  'email-addr': EMAIL_IOC_FIELDS,
  email: EMAIL_IOC_FIELDS,
};

export const getIocEsqlFields = (type: string): readonly string[] | undefined =>
  IOC_TYPE_TO_ESQL_FIELDS[type.toLowerCase()];

export const ecsFieldForIocType = (type: string): string | undefined => getIocEsqlFields(type)?.[0];
