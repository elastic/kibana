/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Marks the collection method the host wants users to pick first. */
export const RecommendedBadge = () => (
  <EuiBadge color="success" data-test-subj="collectionVariantRecommendedBadge">
    {i18n.translate('xpack.observability_onboarding.addDataGrid.recommendedBadge.label', {
      defaultMessage: 'Recommended',
    })}
  </EuiBadge>
);
