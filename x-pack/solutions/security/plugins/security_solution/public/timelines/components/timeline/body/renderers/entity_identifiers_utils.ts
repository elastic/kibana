/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';

export type EntityIdentifiers = Record<string, string>;

/**
 * Helper function to get a field value from TimelineNonEcsData array
 */
const getFieldValue = (data: TimelineNonEcsData[], fieldName: string): string | null => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null && Array.isArray(item.value) && item.value.length > 0) {
    return item.value[0];
  }
  return null;
};

/**
 * Helper function to extract user entityIdentifiers from timeline event data
 * Priority: user.entity.id > user.id > user.email > user.name (with related fields)
 */
export const getUserEntityIdentifiersFromTimelineData = (
  data: TimelineNonEcsData[]
): EntityIdentifiers | null => {
  const identifiers: EntityIdentifiers = {};

  // Check fields in priority order (same as entity store EUID logic)
  const userEntityId = getFieldValue(data, 'user.entity.id');
  if (userEntityId) {
    identifiers['user.entity.id'] = userEntityId;
  }

  const userId = getFieldValue(data, 'user.id');
  if (userId) {
    identifiers['user.id'] = userId;
  }

  const userEmail = getFieldValue(data, 'user.email');
  if (userEmail) {
    identifiers['user.email'] = userEmail;
  }

  const userName = getFieldValue(data, 'user.name');
  if (userName) {
    identifiers['user.name'] = userName;
    // Add related fields that might be used for identification
    const userDomain = getFieldValue(data, 'user.domain');
    if (userDomain) {
      identifiers['user.domain'] = userDomain;
    }
    const hostId = getFieldValue(data, 'host.id');
    if (hostId) {
      identifiers['host.id'] = hostId;
    }
    const hostDomain = getFieldValue(data, 'host.domain');
    if (hostDomain) {
      identifiers['host.domain'] = hostDomain;
    }
    const hostName = getFieldValue(data, 'host.name');
    if (hostName) {
      identifiers['host.name'] = hostName;
    }
    const hostHostname = getFieldValue(data, 'host.hostname');
    if (hostHostname) {
      identifiers['host.hostname'] = hostHostname;
    }
  }

  return Object.keys(identifiers).length > 0 ? identifiers : null;
};

/**
 * Helper function to extract host entityIdentifiers from timeline event data
 * Priority: host.entity.id > host.id > host.name/hostname (with related fields)
 */
export const getHostEntityIdentifiersFromTimelineData = (
  data: TimelineNonEcsData[]
): EntityIdentifiers | null => {
  const identifiers: EntityIdentifiers = {};

  // Check fields in priority order (same as entity store EUID logic)
  const hostEntityId = getFieldValue(data, 'host.entity.id');
  if (hostEntityId) {
    identifiers['host.entity.id'] = hostEntityId;
  }

  const hostId = getFieldValue(data, 'host.id');
  if (hostId) {
    identifiers['host.id'] = hostId;
  }

  const hostName = getFieldValue(data, 'host.name');
  if (hostName) {
    identifiers['host.name'] = hostName;
    // Add related fields that might be used for identification
    const hostDomain = getFieldValue(data, 'host.domain');
    if (hostDomain) {
      identifiers['host.domain'] = hostDomain;
    }
    const hostMac = getFieldValue(data, 'host.mac');
    if (hostMac) {
      identifiers['host.mac'] = hostMac;
    }
  }

  const hostHostname = getFieldValue(data, 'host.hostname');
  if (hostHostname) {
    identifiers['host.hostname'] = hostHostname;
    // Add related fields that might be used for identification
    const hostDomain = getFieldValue(data, 'host.domain');
    if (hostDomain) {
      identifiers['host.domain'] = hostDomain;
    }
    const hostMac = getFieldValue(data, 'host.mac');
    if (hostMac) {
      identifiers['host.mac'] = hostMac;
    }
  }

  return Object.keys(identifiers).length > 0 ? identifiers : null;
};
