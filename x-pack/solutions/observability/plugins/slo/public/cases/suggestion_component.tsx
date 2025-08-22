/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionChildrenProps } from '@kbn/cases-plugin/public';
import React from 'react';
import type { SLOSuggestion } from '../../common/cases/suggestions';
import { SloOverview } from '../embeddable/slo/overview/slo_overview';

export function SLOSuggestionChildren(props: SuggestionChildrenProps<SLOSuggestion>) {
  const { suggestion } = props;
  if (suggestion.data.length === 1) {
    const slo = suggestion.data[0].payload;
    return <SloOverview sloId={slo.id} sloInstanceId={slo.instanceId} />;
  }
}
