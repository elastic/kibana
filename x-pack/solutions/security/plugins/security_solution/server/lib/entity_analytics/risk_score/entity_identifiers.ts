/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EntityType,
  EntityTypeToNewIdentifierField,
} from '../../../../common/entity_analytics/types';

/**
 * Generates an ES|QL EVAL clause that computes a unique entity identifier (EUID).
 * The EUID calculation uses a priority-based COALESCE approach to determine the most
 * reliable identifier for each entity type.
 *
 * For users: Uses user.entity.id, user.id, user.email, or a combination of user.name
 * with domain/host context, falling back to user.name.
 *
 * For hosts: Uses host.entity.id, host.id, or a combination of host.name/hostname
 * with domain/mac context, falling back to host.name or host.hostname.
 */
export const generateEUID = (entityType: EntityType): string => {
  if (entityType === EntityType.user) {
    return `EVAL user.entity.id = COALESCE(
                user.entity.id,
                user.id,
                user.email,
                CASE(user.name IS NOT NULL AND user.name != "",
                  CASE(
                    user.domain IS NOT NULL AND user.domain != "", CONCAT(user.name, "@", user.domain),
                    host.id IS NOT NULL AND host.id != "", CONCAT(user.name, "@", host.id),
                    host.domain IS NOT NULL AND host.domain != "", CASE(
                      host.name IS NOT NULL AND host.name != "", CONCAT(user.name, "@", host.name, ".", TO_STRING(host.domain)),
                      host.hostname IS NOT NULL AND host.hostname != "", CONCAT(user.name, "@", host.hostname, ".", TO_STRING(host.domain)),
                      NULL
                    ),
                    host.name IS NOT NULL AND host.name != "", CONCAT(user.name, "@", host.name),
                    host.hostname IS NOT NULL AND host.hostname != "", CONCAT(user.name, "@", host.hostname),
                    NULL
                  ),
                  NULL
                ),
                user.name
            )`;
  } else if (entityType === EntityType.host) {
    return `EVAL host.entity.id = COALESCE(
                host.entity.id,
                host.id,
                CASE(host.domain IS NOT NULL AND host.domain != "",
                  CASE(
                    host.name IS NOT NULL AND host.name != "", CONCAT(host.name, ".", TO_STRING(host.domain)),
                    host.hostname IS NOT NULL AND host.hostname != "", CONCAT(host.hostname, ".", TO_STRING(host.domain)),
                    NULL
                  ),
                  NULL
                ),
                CASE(host.mac IS NOT NULL AND host.mac != "",
                  CASE(
                    host.name IS NOT NULL AND host.name != "", CONCAT(host.name, "|", TO_STRING(host.mac)),
                    host.hostname IS NOT NULL AND host.hostname != "", CONCAT(host.hostname, "|", TO_STRING(host.mac)),
                    NULL
                  ),
                  NULL
                ),
                host.name,
                host.hostname
              )`;
  } else if (entityType === EntityType.service) {
    // Service entities use the standard service.name field
    return `EVAL service.entity.id = COALESCE(service.name)`;
  }
  // Generic entities already use entity.id as their identifier
  return '';
};

/**
 * Painless helper function that checks if a value is valid (not null and not empty string).
 * This is used as a prefix for the entity ID runtime mapping scripts.
 */
const PAINLESS_IS_VALID_HELPER = `
boolean isValid(def value) {
  if (value == null) {
    return false;
  }
  if (value instanceof String && value.trim().isEmpty()) {
    return false;
  }
  return true;
}
`;

/**
 * Generates a Painless script for computing host.entity.id at runtime.
 * This script calculates a unique identifier for host entities using a priority-based fallback:
 * 1. host.entity.id (if already present in source document)
 * 2. host.id
 * 3. host.name.host.domain
 * 4. host.hostname.host.domain
 * 5. host.name|host.mac
 * 6. host.hostname|host.mac
 * 7. host.hostname
 * 8. host.name
 */
export const getHostEntityIdPainlessScript = (): string => {
  return `
${PAINLESS_IS_VALID_HELPER}
// Helper to safely get nested field from source
def getNestedField(def source, String path) {
  def parts = path.splitOnToken('.');
  def current = source;
  for (def part : parts) {
    if (current == null || !(current instanceof Map)) {
      return null;
    }
    current = current.get(part);
  }
  return current;
}
// Check if host.entity.id already exists in the source document (not runtime field)
def existingEntityId = getNestedField(params._source, 'host.entity.id');
if (isValid(existingEntityId)) {
  emit(existingEntityId.toString());
  return;
}
def hostId = doc.containsKey('host.id') && doc['host.id'].size() > 0 ? doc['host.id'].value : null;
def hostName = doc.containsKey('host.name') && doc['host.name'].size() > 0 ? doc['host.name'].value : null;
def hostHostname = doc.containsKey('host.hostname') && doc['host.hostname'].size() > 0 ? doc['host.hostname'].value : null;
def hostDomain = doc.containsKey('host.domain') && doc['host.domain'].size() > 0 ? doc['host.domain'].value : null;
def hostMac = doc.containsKey('host.mac') && doc['host.mac'].size() > 0 ? doc['host.mac'].value : null;
// 2. host.id
if (isValid(hostId)) {
  emit(hostId);
  return;
}
// 3. host.name.host.domain
if (isValid(hostName) && isValid(hostDomain)) {
  emit(hostName + "." + hostDomain);
  return;
}
// 4. host.hostname.host.domain
if (isValid(hostHostname) && isValid(hostDomain)) {
  emit(hostHostname + "." + hostDomain);
  return;
}
// 5. host.name|host.mac
if (isValid(hostName) && isValid(hostMac)) {
  emit(hostName + "|" + hostMac);
  return;
}
// 6. host.hostname|host.mac
if (isValid(hostHostname) && isValid(hostMac)) {
  emit(hostHostname + "|" + hostMac);
  return;
}
// 7. host.hostname
if (isValid(hostHostname)) {
  emit(hostHostname);
  return;
}
// 8. host.name
if (isValid(hostName)) {
  emit(hostName);
  return;
}
// No valid identifier found - emit empty string to avoid null issues
emit("");
`;
};

/**
 * Generates a Painless script for computing user.entity.id at runtime.
 * This script calculates a unique identifier for user entities using a priority-based fallback:
 * 1. user.entity.id (if already present in source document)
 * 2. user.id
 * 3. user.email
 * 4. user.name@user.domain
 * 5. user.name@host.entity.id (computed)
 * 6. user.name
 */
export const getUserEntityIdPainlessScript = (): string => {
  return `
${PAINLESS_IS_VALID_HELPER}
// Helper to safely get nested field from source
def getNestedField(def source, String path) {
  def parts = path.splitOnToken('.');
  def current = source;
  for (def part : parts) {
    if (current == null || !(current instanceof Map)) {
      return null;
    }
    current = current.get(part);
  }
  return current;
}
// Check if user.entity.id already exists in the source document (not runtime field)
def existingEntityId = getNestedField(params._source, 'user.entity.id');
if (isValid(existingEntityId)) {
  emit(existingEntityId.toString());
  return;
}
def userId = doc.containsKey('user.id') && doc['user.id'].size() > 0 ? doc['user.id'].value : null;
def userEmail = doc.containsKey('user.email') && doc['user.email'].size() > 0 ? doc['user.email'].value : null;
def userName = doc.containsKey('user.name') && doc['user.name'].size() > 0 ? doc['user.name'].value : null;
def userDomain = doc.containsKey('user.domain') && doc['user.domain'].size() > 0 ? doc['user.domain'].value : null;
// Compute host.entity.id for potential use in user.entity.id
// First check if it exists in source document
def hostEntityId = getNestedField(params._source, 'host.entity.id');
if (!isValid(hostEntityId)) {
  def hostId = doc.containsKey('host.id') && doc['host.id'].size() > 0 ? doc['host.id'].value : null;
  def hostName = doc.containsKey('host.name') && doc['host.name'].size() > 0 ? doc['host.name'].value : null;
  def hostHostname = doc.containsKey('host.hostname') && doc['host.hostname'].size() > 0 ? doc['host.hostname'].value : null;
  def hostDomain = doc.containsKey('host.domain') && doc['host.domain'].size() > 0 ? doc['host.domain'].value : null;
  def hostMac = doc.containsKey('host.mac') && doc['host.mac'].size() > 0 ? doc['host.mac'].value : null;
  if (isValid(hostId)) {
    hostEntityId = hostId;
  } else if (isValid(hostName) && isValid(hostDomain)) {
    hostEntityId = hostName + "." + hostDomain;
  } else if (isValid(hostHostname) && isValid(hostDomain)) {
    hostEntityId = hostHostname + "." + hostDomain;
  } else if (isValid(hostName) && isValid(hostMac)) {
    hostEntityId = hostName + "|" + hostMac;
  } else if (isValid(hostHostname) && isValid(hostMac)) {
    hostEntityId = hostHostname + "|" + hostMac;
  } else if (isValid(hostHostname)) {
    hostEntityId = hostHostname;
  } else if (isValid(hostName)) {
    hostEntityId = hostName;
  }
}
// 2. user.id
if (isValid(userId)) {
  emit(userId);
  return;
}
// 3. user.email
if (isValid(userEmail)) {
  emit(userEmail);
  return;
}
// 4. user.name@user.domain
if (isValid(userName) && isValid(userDomain)) {
  emit(userName + "@" + userDomain);
  return;
}
// 5. user.name@host.entity.id
if (isValid(userName) && isValid(hostEntityId)) {
  emit(userName + "@" + hostEntityId);
  return;
}
// 6. user.name
if (isValid(userName)) {
  emit(userName);
  return;
}
// No valid identifier found - emit empty string to avoid null issues
emit("");
`;
};

/**
 * Generates a Painless script for computing service.entity.id at runtime.
 * This script calculates a unique identifier for service entities using a simple fallback:
 * 1. service.entity.id (if already present in source document)
 * 2. service.name
 */
export const getServiceEntityIdPainlessScript = (): string => {
  return `
${PAINLESS_IS_VALID_HELPER}
// Helper to safely get nested field from source
def getNestedField(def source, String path) {
  def parts = path.splitOnToken('.');
  def current = source;
  for (def part : parts) {
    if (current == null || !(current instanceof Map)) {
      return null;
    }
    current = current.get(part);
  }
  return current;
}
// Check if service.entity.id already exists in the source document (not runtime field)
def existingEntityId = getNestedField(params._source, 'service.entity.id');
if (isValid(existingEntityId)) {
  emit(existingEntityId.toString());
  return;
}
if (doc.containsKey('service.name') && doc['service.name'].size() > 0) {
  emit(doc['service.name'].value);
  return;
}
emit("");
`;
};

/**
 * Returns the Painless script for computing the entity ID field for a given entity type.
 */
export const getEntityIdPainlessScript = (entityType: EntityType): string | null => {
  switch (entityType) {
    case EntityType.host:
      return getHostEntityIdPainlessScript();
    case EntityType.user:
      return getUserEntityIdPainlessScript();
    case EntityType.service:
      return getServiceEntityIdPainlessScript();
    case EntityType.generic:
      // Generic entities use entity.id directly, no runtime computation needed
      return null;
    default:
      return null;
  }
};

/**
 * Generates runtime mappings for computing entity IDs for the specified entity types.
 * These mappings are used in composite aggregations to group by computed entity IDs.
 */
export const getEntityIdRuntimeMappings = (
  entityTypes: EntityType[]
): Record<string, { type: string; script: { source: string } }> => {
  const mappings: Record<string, { type: string; script: { source: string } }> = {};

  for (const entityType of entityTypes) {
    const script = getEntityIdPainlessScript(entityType);
    if (script) {
      const fieldName = EntityTypeToNewIdentifierField[entityType];
      mappings[fieldName] = {
        type: 'keyword',
        script: {
          source: script,
        },
      };
    }
  }

  return mappings;
};
