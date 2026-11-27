/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function ConnectorCountBadge({
  count,
  'data-test-subj': dataTestSubj,
}: {
  count: number;
  'data-test-subj'?: string;
}): React.ReactElement | null {
  if (count === 0) return null;
  return (
    <EuiBadge color="success" iconType="check" iconSide="left" data-test-subj={dataTestSubj}>
      {i18n.translate('xpack.nightshift.connectorCountBadge.label', {
        defaultMessage: '{count, plural, one {# connector} other {# connectors}}',
        values: { count },
      })}
    </EuiBadge>
  );
}
