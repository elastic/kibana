/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedField } from '../types';

const iconLookup: Record<string, string> = {
  // Entity fields
  'host.name': 'display',
  'host.hostname': 'display',
  'user.name': 'user',
  'user.id': 'user',
  'process.name': 'gear',
  'process.pid': 'gear',
  'file.name': 'document',
  'file.path': 'document',
  'network.name': 'globe',
  'network.ip': 'globe',
  'source.ip': 'globe',
  'source.port': 'globe',
  'destination.ip': 'globe',
  'destination.port': 'globe',
  // Alert IDs
  _id: 'warning',
  'kibana.alert.uuid': 'warning',
  // Hash fields
  'file.hash.md5': 'key',
  'file.hash.sha1': 'key',
  'file.hash.sha256': 'key',
  'file.hash.sha384': 'key',
  'file.hash.sha512': 'key',
  'file.hash.ssdeep': 'key',
  'file.hash.tlsh': 'key',
  'file.hash.imphash': 'key',
  'file.hash.pehash': 'key',
  'process.hash.md5': 'key',
  'process.hash.sha1': 'key',
  'process.hash.sha256': 'key',
  'process.hash.sha384': 'key',
  'process.hash.sha512': 'key',
  'process.hash.ssdeep': 'key',
  'process.hash.tlsh': 'key',
  'process.hash.imphash': 'key',
  'process.hash.pehash': 'key',
  'dll.hash.md5': 'key',
  'dll.hash.sha1': 'key',
  'dll.hash.sha256': 'key',
  'dll.hash.sha384': 'key',
  'dll.hash.sha512': 'key',
  'dll.hash.ssdeep': 'key',
  'dll.hash.tlsh': 'key',
  'dll.hash.imphash': 'key',
  'dll.hash.pehash': 'key',
  // Opaque entity / process IDs
  'process.entity_id': 'tag',
  'process.parent.entity_id': 'tag',
  'process.entry_leader.entity_id': 'tag',
  'process.session_leader.entity_id': 'tag',
  'process.group_leader.entity_id': 'tag',
  'agent.id': 'tag',
  'host.id': 'tag',
  'group.id': 'tag',
  'container.id': 'tag',
  'cloud.instance.id': 'tag',
  'device.id': 'tag',
  'event.id': 'tag',
  'kibana.alert.rule.uuid': 'tag',
  'kibana.alert.rule.execution.uuid': 'tag',
  'kibana.alert.original_event.id': 'tag',
};

export const getIconFromFieldName = (fieldName: string): string => {
  return iconLookup[fieldName] || '';
};

/**
 * Matches every `{{ fieldName value }}` token in a string.
 * Capture group 1 = field name, capture group 2 = field value.
 */
export const FIELD_TOKEN_REGEX = /\{\{\s*(\S+)\s+(.*?)\s*\}\}/g;

/**
 * Constructs a `ParsedField` from the two capture groups of `FIELD_TOKEN_REGEX`.
 */
export const parseFieldToken = (fieldName: string, fieldValue: string): ParsedField => ({
  name: fieldName,
  icon: getIconFromFieldName(fieldName),
  operator: ':',
  value: fieldValue,
});
