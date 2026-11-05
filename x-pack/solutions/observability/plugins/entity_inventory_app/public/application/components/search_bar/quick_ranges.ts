/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiSuperDatePickerProps } from '@elastic/eui';
import { ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS } from '../../constants';

type QuickRange = NonNullable<EuiSuperDatePickerProps['commonlyUsedRanges']>[number];

export const QUICK_RANGES: QuickRange[] = [
  {
    start: 'now/d',
    end: 'now/d',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.today', {
      defaultMessage: 'Today',
    }),
  },
  {
    start: 'now-1d/d',
    end: 'now-1d/d',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.yesterday', {
      defaultMessage: 'Yesterday',
    }),
  },
  {
    start: 'now-15m',
    end: 'now',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.last15Minutes', {
      defaultMessage: 'Last 15 minutes',
    }),
  },
  {
    start: 'now-30m',
    end: 'now',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.last30Minutes', {
      defaultMessage: 'Last 30 minutes',
    }),
  },
  {
    start: 'now-1h',
    end: 'now',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.last1Hour', {
      defaultMessage: 'Last 1 hour',
    }),
  },
  {
    start: 'now-3h',
    end: 'now',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.last3Hours', {
      defaultMessage: 'Last 3 hours',
    }),
  },
  {
    start: 'now-12h',
    end: 'now',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.last12Hours', {
      defaultMessage: 'Last 12 hours',
    }),
  },
  {
    start: 'now-24h',
    end: 'now',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.last24Hours', {
      defaultMessage: 'Last 24 hours',
    }),
  },
  {
    start: `now-${ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS}d`,
    end: 'now',
    label: i18n.translate('xpack.entityInventoryApp.datePicker.quickRanges.lastDays', {
      defaultMessage: 'Last {maxDays} days',
      values: { maxDays: ENTITY_INVENTORY_MAX_TIME_RANGE_DAYS },
    }),
  },
];
