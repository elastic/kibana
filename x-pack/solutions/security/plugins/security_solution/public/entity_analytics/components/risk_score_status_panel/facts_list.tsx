/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTextColor } from '@elastic/eui';
import moment from 'moment';
import type { RiskScoreStatusFacts } from './types';
import {
  FACT_ENTITIES_TRACKED,
  FACT_LAST_RUN,
  FACT_MATCHING_ALERTS,
  FACT_SCORING_WINDOW,
} from './translations';

interface FactsListProps {
  facts: RiskScoreStatusFacts;
  'data-test-subj'?: string;
}

type FactItem = { icon: string; text: string; 'data-test-subj': string };

export const FactsList: React.FC<FactsListProps> = ({
  facts,
  'data-test-subj': dataTestSubj = 'risk-score-status-facts',
}) => {
  const items = useMemo<FactItem[]>(() => {
    const list: FactItem[] = [];

    if (facts.lastSuccessTimestamp) {
      list.push({
        icon: 'checkInCircleFilled',
        text: FACT_LAST_RUN(moment(facts.lastSuccessTimestamp).fromNow()),
        'data-test-subj': `${dataTestSubj}-lastRun`,
      });
    }
    if (facts.entitiesTracked != null) {
      list.push({
        icon: 'users',
        text: FACT_ENTITIES_TRACKED(facts.entitiesTracked),
        'data-test-subj': `${dataTestSubj}-entitiesTracked`,
      });
    }
    if (facts.scoringWindow) {
      list.push({
        icon: 'search',
        text: FACT_SCORING_WINDOW(facts.scoringWindow.start, facts.scoringWindow.end),
        'data-test-subj': `${dataTestSubj}-scoringWindow`,
      });
    }
    if (facts.matchingAlertsCount != null) {
      list.push({
        icon: 'bell',
        text: FACT_MATCHING_ALERTS(facts.matchingAlertsCount),
        'data-test-subj': `${dataTestSubj}-matchingAlerts`,
      });
    }

    return list;
  }, [facts, dataTestSubj]);

  if (items.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj={dataTestSubj}>
      {items.map((item) => (
        <EuiFlexItem key={item['data-test-subj']} grow={false}>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            data-test-subj={item['data-test-subj']}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type={item.icon} size="s" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <EuiTextColor color="subdued">{item.text}</EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
