/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge } from '@elastic/eui';
import * as i18n from './translations';

const ExperimentalBadgeComponent: React.FC = () => (
  <EuiBetaBadge
    data-test-subj="experimentalBadge"
    label={i18n.EXPERIMENTAL}
    tooltipContent={i18n.EXPERIMENTAL_TOOLTIP}
    tooltipPosition="bottom"
    size="s"
  />
);

export const ExperimentalBadge = React.memo(ExperimentalBadgeComponent);
