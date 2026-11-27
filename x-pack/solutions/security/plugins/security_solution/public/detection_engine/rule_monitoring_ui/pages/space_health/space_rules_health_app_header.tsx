/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { TECHNICAL_PREVIEW } from '../../../../common/components/technical_preview_badge/translations';
import * as i18n from './translations';

export const SpaceRulesHealthAppHeader = React.memo(() => (
  <SecurityAppHeader
    title={i18n.SPACE_RULES_HEALTH_TITLE}
    badges={[{ label: TECHNICAL_PREVIEW, color: 'accent' }]}
    spacing="largeBleed"
  />
));

SpaceRulesHealthAppHeader.displayName = 'SpaceRulesHealthAppHeader';
