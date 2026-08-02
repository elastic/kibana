/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type Type } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/server';
import {
  buildWatchAutonomyUiSettingKey,
  SYSTEM_SECURITY_WATCH_IDS,
  WATCH_AUTONOMY_LEVELS,
} from '@kbn/pnd-common';
import type { WatchAutonomyLevel } from '@kbn/pnd-common';
import { PND_FEATURE_ID } from '../../../common/constants';
import { DEFAULT_AUTONOMY_LEVEL, isWatchAutonomyLevel } from '../as_watch_autonomy_level';

/** A per-watch autonomy setting always carries a validation schema. */
type AutonomyUiSetting = UiSettingsParams<WatchAutonomyLevel> & {
  schema: Type<WatchAutonomyLevel>;
};

/**
 * The persisted level is one of {@link WATCH_AUTONOMY_LEVELS} — the same scale the settings
 * contract, the slider and the gate registry speak.
 *
 * A validated `schema.string` rather than a `schema.oneOf` of literals: `oneOf`'s overloads are
 * fixed-arity tuples, so it cannot take a list derived from the shared array, and spelling the three
 * levels out here would be a fourth copy of the scale that nothing keeps in step. Widening the dial
 * is therefore a one-line change in `@kbn/pnd-common` and this follows automatically.
 */
const autonomyLevelSchema = (): Type<WatchAutonomyLevel> =>
  schema.string({
    validate: (value) =>
      isWatchAutonomyLevel(value)
        ? undefined
        : `must be one of ${WATCH_AUTONOMY_LEVELS.join(', ')}`,
  }) as Type<WatchAutonomyLevel>;

/**
 * One space-scoped uiSettings definition per managed system watch that persists
 * its autonomy level. Each is `readonly: true` so it stays out of the generic
 * Advanced Settings editor (following the precedent at
 * `security_solution/server/ui_settings.ts`) and is written server-side behind
 * the autonomy privilege; the bounded `schema` is a backstop on every write.
 */
export const getAutonomyUiSettings = (): Record<string, AutonomyUiSetting> =>
  Object.fromEntries(
    SYSTEM_SECURITY_WATCH_IDS.map((watchId) => [
      buildWatchAutonomyUiSettingKey(watchId),
      {
        category: [PND_FEATURE_ID],
        description: i18n.translate('xpack.pnd.uiSettings.autonomyLevel.description', {
          defaultMessage:
            'Persisted autonomy level ({levels}) for the "{watchId}" managed watch. Written server-side behind the "Manage autonomy" privilege.',
          values: { levels: WATCH_AUTONOMY_LEVELS.join(', '), watchId },
        }),
        name: i18n.translate('xpack.pnd.uiSettings.autonomyLevel.name', {
          defaultMessage: 'PND autonomy level: {watchId}',
          values: { watchId },
        }),
        options: [...WATCH_AUTONOMY_LEVELS],
        readonly: true,
        requiresPageReload: false,
        schema: autonomyLevelSchema(),
        type: 'select',
        value: DEFAULT_AUTONOMY_LEVEL,
      },
    ])
  );
