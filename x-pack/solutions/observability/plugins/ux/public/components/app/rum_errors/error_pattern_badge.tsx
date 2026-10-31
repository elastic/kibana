/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { RumErrorPattern } from '../../../../common/rum_app';

const PATTERN_LABEL: Record<RumErrorPattern, string> = {
  new: i18n.translate('xpack.ux.errors.pattern.newBadge', { defaultMessage: 'New' }),
  regressed: i18n.translate('xpack.ux.errors.pattern.regressedBadge', { defaultMessage: 'Back' }),
  persistent: i18n.translate('xpack.ux.errors.pattern.persistentBadge', {
    defaultMessage: 'Steady',
  }),
  improving: i18n.translate('xpack.ux.errors.pattern.improvingBadge', {
    defaultMessage: 'Cooling',
  }),
};

const PATTERN_TIP: Record<RumErrorPattern, string> = {
  new: i18n.translate('xpack.ux.errors.pattern.newTooltip', {
    defaultMessage: 'First seen in this time range',
  }),
  regressed: i18n.translate('xpack.ux.errors.pattern.regressedTooltip', {
    defaultMessage: 'Returned after a quiet previous window',
  }),
  persistent: i18n.translate('xpack.ux.errors.pattern.persistentTooltip', {
    defaultMessage: 'Still firing at a similar rate',
  }),
  improving: i18n.translate('xpack.ux.errors.pattern.improvingTooltip', {
    defaultMessage: 'Down 20% or more versus the previous window',
  }),
};

const PATTERN_COLOR: Record<RumErrorPattern, 'accent' | 'warning' | 'success' | 'hollow'> = {
  new: 'accent',
  regressed: 'warning',
  persistent: 'hollow',
  improving: 'success',
};

export function ErrorPatternBadge({
  pattern,
  showPersistent = false,
}: {
  pattern: RumErrorPattern;
  showPersistent?: boolean;
}) {
  if (pattern === 'persistent' && !showPersistent) {
    return null;
  }
  return (
    <EuiToolTip content={PATTERN_TIP[pattern]}>
      <EuiBadge color={PATTERN_COLOR[pattern]} tabIndex={0}>
        {PATTERN_LABEL[pattern]}
      </EuiBadge>
    </EuiToolTip>
  );
}

export function SharedFailureBadge() {
  return (
    <EuiToolTip
      content={i18n.translate('xpack.ux.errors.pattern.sharedTooltip', {
        defaultMessage: 'This exception fired in more than one application',
      })}
    >
      <EuiBadge color="danger" tabIndex={0}>
        {i18n.translate('xpack.ux.errors.pattern.sharedBadge', { defaultMessage: 'Shared' })}
      </EuiBadge>
    </EuiToolTip>
  );
}
