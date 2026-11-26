/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_APP_START_MS, type StartType } from '../../../../common/mobile/app_starts';

const MAX_START_SECONDS = MAX_APP_START_MS / 1000;

export const APP_START_TITLES: Readonly<Record<StartType, string>> = {
  cold: i18n.translate('xpack.digitalExperience.mobile.appStart.coldTitle', {
    defaultMessage: 'Avg. cold start',
  }),
  warm: i18n.translate('xpack.digitalExperience.mobile.appStart.warmTitle', {
    defaultMessage: 'Avg. warm start',
  }),
};

/** How each average is calculated, with the guard. */
export const APP_START_DESCRIPTIONS: Readonly<Record<StartType, string>> = {
  cold: i18n.translate('xpack.digitalExperience.mobile.appStart.coldDescription', {
    defaultMessage:
      "Average time from a launch that starts the app's process to its first frame, as the SDK reports it in elastic.app.start. Starts over {maxSeconds} seconds are left out: the app was started in the background, for example by a push.",
    values: { maxSeconds: MAX_START_SECONDS },
  }),
  warm: i18n.translate('xpack.digitalExperience.mobile.appStart.warmDescription', {
    defaultMessage:
      'Average time from a launch whose process was still running to its first frame, as the SDK reports it in elastic.app.start. Starts over {maxSeconds} seconds are left out.',
    values: { maxSeconds: MAX_START_SECONDS },
  }),
};

/** The starts an average is based on, e.g. "42 cold starts". */
export const appStartCountLabel = (type: StartType, count: number): string =>
  type === 'cold'
    ? i18n.translate('xpack.digitalExperience.mobile.appStart.coldCount', {
        defaultMessage: '{count, plural, one {# cold start} other {# cold starts}}',
        values: { count },
      })
    : i18n.translate('xpack.digitalExperience.mobile.appStart.warmCount', {
        defaultMessage: '{count, plural, one {# warm start} other {# warm starts}}',
        values: { count },
      });

export const NO_APP_STARTS_LABEL = i18n.translate(
  'xpack.digitalExperience.mobile.appStart.noData',
  {
    defaultMessage: 'No data',
  }
);

export const NO_APP_STARTS_DESCRIPTION = i18n.translate(
  'xpack.digitalExperience.mobile.appStart.noDataDescription',
  {
    defaultMessage:
      'The SDK sent no app start events (elastic.app.start) in the time range and filters.',
  }
);

/** How the average is calculated, and the starts it's based on, or that there were none. */
export const appStartTooltip = (type: StartType, count: number): string =>
  count > 0
    ? i18n.translate('xpack.digitalExperience.mobile.appStart.tooltip', {
        defaultMessage: '{description} Based on {starts}.',
        values: {
          description: APP_START_DESCRIPTIONS[type],
          starts: appStartCountLabel(type, count),
        },
      })
    : `${APP_START_DESCRIPTIONS[type]} ${NO_APP_STARTS_DESCRIPTION}`;
