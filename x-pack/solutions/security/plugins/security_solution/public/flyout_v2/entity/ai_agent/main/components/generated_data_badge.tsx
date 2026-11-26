/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import {
  MOCK_DATA_BADGE,
  MOCK_DATA_TOOLTIP,
} from '../../../../../entity_analytics/components/ai_agents/translations';
import { AI_AGENT_TEST_IDS } from '../test_ids';

/** Marks a value read from a document tagged `poc-mock`. */
export const GeneratedDataBadge = memo(() => (
  <EuiToolTip content={MOCK_DATA_TOOLTIP}>
    <EuiBadge color="warning" tabIndex={0} data-test-subj={AI_AGENT_TEST_IDS.mockBadge}>
      {MOCK_DATA_BADGE}
    </EuiBadge>
  </EuiToolTip>
));
GeneratedDataBadge.displayName = 'GeneratedDataBadge';
