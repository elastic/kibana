/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';

export interface BaseGroupedItemCommonFields {
  id: string;
  /** source index (used for opening single document previews) */
  index?: string;
  /** raw timestamp */
  timestamp?: string | number | Date;
  /** optional ip addresses (normalized to array, UI renders first element) */
  ips?: string[];
  /** optional country codes (e.g. US) - normalized to array, UI renders first element */
  countryCodes?: string[];
}

export interface EventOrAlertSpecificFields extends BaseGroupedItemCommonFields {
  /** document id - used to open flyout preview */
  docId?: string;
  /** action becomes the title */
  action?: string; // if missing we fallback to '-')
  /** actor entity descriptor */
  actor?: { id: string; icon?: string; label?: string };
  /** target entity descriptor */
  target?: { id: string; icon?: string; label?: string };
}

export interface EntitySpecificFields extends BaseGroupedItemCommonFields {
  /** label to show (fallback to id) */
  label?: string;
  /** numeric risk (0-100) */
  risk?: number;
  /** entity icon */
  icon?: string;
}

export interface EventItem extends EventOrAlertSpecificFields {
  itemType: typeof DOCUMENT_TYPE_EVENT;
}
export interface AlertItem extends EventOrAlertSpecificFields {
  itemType: typeof DOCUMENT_TYPE_ALERT;
}
export interface EntityItem extends EntitySpecificFields {
  itemType: typeof DOCUMENT_TYPE_ENTITY;
  type?: string;
  subType?: string;
  availableInEntityStore?: boolean;
}

export type EntityOrEventItem = EventItem | AlertItem | EntityItem;
export type PanelItems = EntityItem[] | (EventItem | AlertItem)[];
