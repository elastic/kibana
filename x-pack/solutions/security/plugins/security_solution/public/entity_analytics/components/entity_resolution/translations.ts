/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RESOLUTION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.sectionTitle',
  { defaultMessage: 'Resolution' }
);

export const RESOLUTION_GROUP_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.groupLinkTitle',
  { defaultMessage: 'Resolution group' }
);

export const RESOLUTION_GROUP_LINK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityResolution.groupLinkTooltip',
  { defaultMessage: 'Show resolution group details' }
);

export const RESOLUTION_EMPTY_STATE = i18n.translate(
  'xpack.securitySolution.entityResolution.emptyState',
  { defaultMessage: 'No entity resolution' }
);

export const ENTITY_NAME_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.entityName',
  { defaultMessage: 'Entity name' }
);

export const ENTITY_ID_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.entityId',
  { defaultMessage: 'Entity ID' }
);

export const SOURCE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.source',
  { defaultMessage: 'Source' }
);

export const RISK_SCORE_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.riskScore',
  { defaultMessage: 'Risk score' }
);

export const ACTIONS_COLUMN = i18n.translate(
  'xpack.securitySolution.entityResolution.columns.actions',
  { defaultMessage: 'Actions' }
);

export const REMOVE_ENTITY_BUTTON = i18n.translate(
  'xpack.securitySolution.entityResolution.removeEntity',
  { defaultMessage: 'Remove from resolution group' }
);

export const TARGET_ENTITY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityResolution.targetEntityTooltip',
  { defaultMessage: 'This is the target entity for this resolution group' }
);

export const CANNOT_REMOVE_TARGET_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityResolution.cannotRemoveTarget',
  { defaultMessage: 'The target entity cannot be removed from the resolution group' }
);

export const ADD_ENTITIES_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.addEntitiesTitle',
  { defaultMessage: 'Add entities to resolution group' }
);

export const SEARCH_ENTITIES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.entityResolution.searchPlaceholder',
  { defaultMessage: 'Search by entity name or ID' }
);

export const ADD_ENTITY_BUTTON = i18n.translate(
  'xpack.securitySolution.entityResolution.addEntity',
  { defaultMessage: 'Add to resolution group' }
);

export const ENTITY_RESOLVED_TOAST = i18n.translate(
  'xpack.securitySolution.entityResolution.entityResolved',
  { defaultMessage: 'Entity resolved' }
);

export const ENTITY_REMOVED_TOAST = i18n.translate(
  'xpack.securitySolution.entityResolution.entityRemoved',
  { defaultMessage: 'Entity removed from resolution group' }
);

export const CONFIRM_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.confirmModal.title',
  { defaultMessage: 'Confirm entity resolution' }
);

export const CONFIRM_MODAL_CANCEL = i18n.translate(
  'xpack.securitySolution.entityResolution.confirmModal.cancel',
  { defaultMessage: 'Cancel' }
);

export const CONFIRM_MODAL_CONFIRM = i18n.translate(
  'xpack.securitySolution.entityResolution.confirmModal.confirm',
  { defaultMessage: 'Confirm resolution' }
);

export const RESOLUTION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityResolution.errorTitle',
  { defaultMessage: 'Resolution error' }
);

export const RESOLUTION_FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.entityResolution.fetchError',
  { defaultMessage: 'Unable to load resolution group' }
);

export const ENTITY_HAS_ALIASES_ERROR = i18n.translate(
  'xpack.securitySolution.entityResolution.entityHasAliasesError',
  {
    defaultMessage:
      'This entity already belongs to another resolution group. Unlink it from its current group before adding it here.',
  }
);
