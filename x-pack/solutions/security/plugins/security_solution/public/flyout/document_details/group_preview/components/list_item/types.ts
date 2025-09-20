/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseGroupedListItemCommonFields {
  id: string;
  /** raw timestamp */
  timestamp?: string | number | Date;
  /** optional ip address */
  ip?: string;
  /** optional country code (e.g. US) */
  countryCode?: string; // we will render flag + country name if provided
}

export interface EventOrAlertSpecificFields extends BaseGroupedListItemCommonFields {
  /** action becomes the title */
  action?: string; // if missing we fallback to '-')
  /** actor entity descriptor */
  actor?: { id: string; icon?: string; label?: string };
  /** target entity descriptor */
  target?: { id: string; icon?: string; label?: string };
}

export interface EntitySpecificFields extends BaseGroupedListItemCommonFields {
  tag?: string;
  /** label to show (fallback to id) */
  label?: string;
  /** numeric risk (0-100) */
  risk?: number;
  /** entity icon */
  icon?: string;
}

export interface EventItem extends EventOrAlertSpecificFields {
  type: 'event';
}
export interface AlertItem extends EventOrAlertSpecificFields {
  type: 'alert';
}
export interface EntityItem extends EntitySpecificFields {
  type: 'entity';
}

export type GroupedListItem = EventItem | AlertItem | EntityItem;
export type GroupedListItemType = EventItem['type'] | AlertItem['type'] | EntityItem['type'];
