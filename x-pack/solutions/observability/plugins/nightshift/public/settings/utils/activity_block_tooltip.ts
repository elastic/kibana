/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const activityPausedTooltip = i18n.translate('xpack.nightshift.settings.activityPausedTooltip', {
  defaultMessage: 'Significant Events activity is paused. Resume it in Settings.',
});

const activityStatusLoadingTooltip = i18n.translate(
  'xpack.nightshift.settings.activityStatusLoadingTooltip',
  {
    defaultMessage: 'Checking Significant Events activity status…',
  }
);

const activityStatusErrorTooltip = i18n.translate(
  'xpack.nightshift.settings.activityStatusErrorTooltip',
  {
    defaultMessage:
      'Could not load Significant Events activity status. New activity stays blocked until status is available.',
  }
);

export const getActivityBlockTooltip = ({
  isLoading,
  isError,
  isBlocked,
}: {
  isLoading: boolean;
  isError: boolean;
  isBlocked: boolean;
}): string | undefined => {
  if (isLoading) {
    return activityStatusLoadingTooltip;
  }
  if (isError) {
    return activityStatusErrorTooltip;
  }
  if (isBlocked) {
    return activityPausedTooltip;
  }
};
