/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';

import { promptType } from '@kbn/security-ai-prompts';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { referenceDataSavedObjectType } from './endpoint/lib/reference_data';
import { protectionUpdatesNoteType } from './endpoint/lib/protection_updates_note/saved_object_mappings';
import { noteType, pinnedEventType, timelineType } from './lib/timeline/saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { legacyType as legacyRuleActionsType } from './lib/detection_engine/rule_actions_legacy';
import { prebuiltRuleAssetType } from './lib/detection_engine/prebuilt_rules';
import { type as signalsMigrationType } from './lib/detection_engine/migrations/saved_objects';
import { manifestType, unifiedManifestType } from './endpoint/lib/artifacts/saved_object_mappings';
import { riskEngineConfigurationType } from './lib/entity_analytics/risk_engine/saved_object';
import { entityEngineDescriptorType } from './lib/entity_analytics/entity_store/saved_object';
import {
  privilegeMonitoringType,
  monitoringEntitySourceType,
} from './lib/entity_analytics/privilege_monitoring/saved_objects';
import {
  PrivilegeMonitoringApiKeyEncryptionParams,
  PrivilegeMonitoringApiKeyType,
} from './lib/entity_analytics/privilege_monitoring/auth/saved_object';

const types = [
  noteType,
  pinnedEventType,
  legacyRuleActionsType,
  prebuiltRuleAssetType,
  timelineType,
  manifestType,
  unifiedManifestType,
  signalsMigrationType,
  riskEngineConfigurationType,
  entityEngineDescriptorType,
  privilegeMonitoringType,
  PrivilegeMonitoringApiKeyType,
  monitoringEntitySourceType,
  protectionUpdatesNoteType,
  promptType,
  referenceDataSavedObjectType,
];

export const savedObjectTypes = types.map((type) => type.name);

export const savedObjectTypesWithoutTimelineAndWithoutNotes = savedObjectTypes.filter((type) => {
  switch (type) {
    case noteType.name:
    case pinnedEventType.name:
    case timelineType.name:
      return false;
    default:
      return true;
  }
});

export const timelineSavedObjectTypes = [timelineType.name, pinnedEventType.name];

export const notesSavedObjectTypes = [noteType.name];

export const initSavedObjects = (savedObjects: CoreSetup['savedObjects']) => {
  types.forEach((type) => savedObjects.registerType(type));
};

export const initEncryptedSavedObjects = ({
  encryptedSavedObjects,
  logger,
}: {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup | undefined;
  logger: Logger;
}) => {
  if (!encryptedSavedObjects) {
    logger.warn('EncryptedSavedObjects plugin not available; skipping registration.');
    return;
  }
  encryptedSavedObjects.registerType(PrivilegeMonitoringApiKeyEncryptionParams);
};
