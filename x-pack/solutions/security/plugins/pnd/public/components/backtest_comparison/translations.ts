/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.pnd.backtestComparison.title', {
  defaultMessage: 'Backtest',
});

export const BEFORE = i18n.translate('xpack.pnd.backtestComparison.beforeLabel', {
  defaultMessage: 'Rule as-is',
});

export const AFTER = i18n.translate('xpack.pnd.backtestComparison.afterLabel', {
  defaultMessage: 'Rule as-proposed',
});

export const ALERTS = i18n.translate('xpack.pnd.backtestComparison.alertsLabel', {
  defaultMessage: 'alerts',
});

export const NOT_MEASURED = i18n.translate('xpack.pnd.backtestComparison.notMeasured', {
  defaultMessage: 'Not measured',
});

export const UNAVAILABLE_TITLE = i18n.translate('xpack.pnd.backtestComparison.unavailableTitle', {
  defaultMessage: 'No backtest available',
});

export const UNAVAILABLE_BODY = i18n.translate('xpack.pnd.backtestComparison.unavailableBody', {
  defaultMessage:
    'The rule preview did not return a result, so the effect of this change on alert volume was not measured. This is not the same as "no change expected".',
});

export const NO_CHANGE = i18n.translate('xpack.pnd.backtestComparison.noChange', {
  defaultMessage: 'No change in alert count',
});

export const fewerAlerts = (count: number): string =>
  i18n.translate('xpack.pnd.backtestComparison.fewerAlerts', {
    defaultMessage: '{count, plural, one {# fewer alert} other {# fewer alerts}}',
    values: { count },
  });

export const moreAlerts = (count: number): string =>
  i18n.translate('xpack.pnd.backtestComparison.moreAlerts', {
    defaultMessage: '{count, plural, one {# more alert} other {# more alerts}}',
    values: { count },
  });

export const windowRange = (from: string, to: string): string =>
  i18n.translate('xpack.pnd.backtestComparison.window', {
    defaultMessage: '{from} to {to}',
    values: { from, to },
  });

export const windowFrom = (from: string): string =>
  i18n.translate('xpack.pnd.backtestComparison.windowFrom', {
    defaultMessage: 'From {from}',
    values: { from },
  });

export const windowTo = (to: string): string =>
  i18n.translate('xpack.pnd.backtestComparison.windowTo', {
    defaultMessage: 'To {to}',
    values: { to },
  });
