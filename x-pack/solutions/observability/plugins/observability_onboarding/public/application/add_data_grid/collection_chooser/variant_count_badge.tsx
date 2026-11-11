/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** How many collection variants a card collapses into its chooser. */
export const VariantCountBadge = ({ count }: { count: number }) => (
  <EuiBadge color="hollow">
    {i18n.translate('xpack.observability_onboarding.addDataGrid.variantCountBadge.label', {
      defaultMessage: '{count, plural, one {# variant} other {# variants}}',
      values: { count },
    })}
  </EuiBadge>
);
