/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import { LifecycleView } from '../../../lifecycle_view';
import * as i18n from '../../translations';

export interface LifecycleStepsSectionProps {
  correlationId: string;
}

/**
 * All 14 catalog rows, grouped by phase — everything the overlay showed before it gained tabs,
 * unchanged.
 *
 * Decision 1 of the 2026-08-17 sync names two tabs and neither of them is this, so it is a
 * **section** at the foot of Overview. It has no case-flyout analogue to be merged into (register
 * #49): the 14-row `PHASE_CATALOG` projection is PND's own surface, so folding it in is the only way
 * to reach two tabs without losing it.
 *
 * A wrapper rather than `LifecycleView` inline, for one reason: it gives the block the same
 * `pndLifecycleSection-{sectionId}` test subject as its siblings, so a browser check can address any
 * section by the same rule. `LifecycleView` itself stays container-agnostic, which is what lets the
 * `/executions/:correlationId` route render the identical rows full width.
 */
export const LifecycleStepsSection: React.FC<LifecycleStepsSectionProps> = ({ correlationId }) => (
  <div data-test-subj="pndLifecycleSection-lifecycle">
    <EuiTitle size="xs">
      <h3>{i18n.SECTION_LIFECYCLE}</h3>
    </EuiTitle>

    <EuiSpacer size="s" />

    <LifecycleView correlationId={correlationId} />
  </div>
);
