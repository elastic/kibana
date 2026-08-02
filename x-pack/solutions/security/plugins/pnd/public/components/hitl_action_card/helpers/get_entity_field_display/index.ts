/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';

import * as i18n from '../../translations';

export interface PndEntityFieldDisplay {
  iconType: IconType;
  label: string;
}

/**
 * The four ECS fields `GET /internal/pnd/discovery-context` aggregates on.
 *
 * The route returns raw field names — there is no server-side display name — so
 * this is where the blast radius gets read as "Host host-1" rather than
 * "host.name host-1".
 */
const DISPLAY_BY_FIELD: Readonly<Record<string, PndEntityFieldDisplay>> = {
  'destination.ip': { iconType: 'globe', label: i18n.DESTINATION_IP },
  'host.name': { iconType: 'storage', label: i18n.HOST },
  'source.ip': { iconType: 'globe', label: i18n.SOURCE_IP },
  'user.name': { iconType: 'user', label: i18n.USER },
};

/** A field with no label of its own is still an ECS field name, which is legible. */
const UNKNOWN_ICON: IconType = 'dot';

/**
 * How to draw one blast-radius line.
 *
 * A field this does not know falls back to its own ECS name rather than to a
 * guess: the aggregation gains a fifth field the day someone adds one to the
 * route, and an entity labelled "Unknown" would be worse than one labelled
 * `process.name`.
 */
export const getEntityFieldDisplay = (field: string): PndEntityFieldDisplay =>
  DISPLAY_BY_FIELD[field] ?? { iconType: UNKNOWN_ICON, label: field };
