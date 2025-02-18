/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { AddInvestigationItem } from '../add_investigation_item/add_investigation_item';
import { AssistantHypothesis } from '../assistant_hypothesis/assistant_hypothesis';
import { InvestigationItemsList } from '../investigation_items_list/investigation_items_list';
import { InvestigationTimeline } from '../investigation_timeline/investigation_timeline';

export function InvestigationItems() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive>
      <InvestigationTimeline />
      <AssistantHypothesis />
      <InvestigationItemsList />
      <AddInvestigationItem />
    </EuiFlexGroup>
  );
}
