/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

const NEAR_EXPIRY_DAYS = 3;

interface Props {
  expiresAt?: string;
  compact?: boolean;
}

export function DurabilityBadge({ expiresAt, compact = false }: Props) {
  if (!expiresAt) {
    return (
      <EuiToolTip content={DURABLE_TOOLTIP}>
        <EuiBadge color="hollow" iconType="pinFilled" tabIndex={0}>
          {DURABLE_LABEL}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  const nearExpiry = moment(expiresAt).diff(moment(), 'days', true) <= NEAR_EXPIRY_DAYS;
  return (
    <EuiToolTip
      content={i18n.translate('xpack.significantEventsApp.durabilityBadge.expiringTooltip', {
        defaultMessage: 'Expires {date}. This knowledge is removed automatically once it lapses.',
        values: { date: moment(expiresAt).format('lll') },
      })}
    >
      <EuiBadge color={nearExpiry ? 'warning' : 'hollow'} iconType="clock" tabIndex={0}>
        {compact ? (
          EXPIRING_LABEL
        ) : (
          <FormattedMessage
            id="xpack.significantEventsApp.durabilityBadge.expiringRelative"
            defaultMessage="Expires {relative}"
            values={{ relative: <FormattedRelative value={expiresAt} /> }}
          />
        )}
      </EuiBadge>
    </EuiToolTip>
  );
}

const DURABLE_LABEL = i18n.translate('xpack.significantEventsApp.durabilityBadge.durableLabel', {
  defaultMessage: 'Durable',
});

const DURABLE_TOOLTIP = i18n.translate(
  'xpack.significantEventsApp.durabilityBadge.durableTooltip',
  {
    defaultMessage: 'Kept indefinitely. This knowledge will not expire automatically.',
  }
);

const EXPIRING_LABEL = i18n.translate('xpack.significantEventsApp.durabilityBadge.expiringLabel', {
  defaultMessage: 'Expiring',
});
