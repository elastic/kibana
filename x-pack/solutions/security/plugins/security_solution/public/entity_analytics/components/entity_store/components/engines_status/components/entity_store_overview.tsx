/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
} from '@elastic/eui';
import { capitalize } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import type { EntityType } from '../../../../../../../common/entity_analytics/types';
import { getEntityIcon } from '../../../../threat_hunting/top_threat_hunting_leads/utils';
import { useEntityCountsByType } from '../../../hooks/use_entity_counts_by_type';
import { ENTITY_STORE_OVERVIEW_TEST_ID } from '../../../../../test_ids';
import { formatCount } from '../format';
import type { OverallHealth } from '../helpers';

const HEALTH: Record<OverallHealth, { color: string; label: string }> = {
  healthy: {
    color: 'success',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.overview.healthy', {
      defaultMessage: 'Healthy',
    }),
  },
  problems: {
    color: 'danger',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.overview.problems', {
      defaultMessage: 'Needs attention',
    }),
  },
  in_progress: {
    color: 'warning',
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityStore.overview.inProgress',
      { defaultMessage: 'Installing' }
    ),
  },
  stopped: {
    color: 'subdued',
    label: i18n.translate('xpack.securitySolution.entityAnalytics.entityStore.overview.stopped', {
      defaultMessage: 'Stopped',
    }),
  },
};

const summary = (health: OverallHealth, problemCount: number, engineCount: number) => {
  switch (health) {
    case 'healthy':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.overview.healthySummary',
        {
          defaultMessage:
            '{engineCount, plural, one {The engine is} other {All # engines are}} running and no task is failing.',
          values: { engineCount },
        }
      );
    case 'problems':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.overview.problemsSummary',
        {
          defaultMessage:
            '{problemCount, plural, one {# problem needs} other {# problems need}} attention.',
          values: { problemCount },
        }
      );
    case 'in_progress':
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.overview.inProgressSummary',
        { defaultMessage: 'Engines are installing or updating.' }
      );
    default:
      return i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityStore.overview.stoppedSummary',
        { defaultMessage: 'All engines are stopped.' }
      );
  }
};

/** The answer first: is the store healthy, and how many entities does it hold? */
export const EntityStoreOverview = ({
  health,
  problemCount,
  engineCount,
  entityTypes,
}: {
  health: OverallHealth;
  problemCount: number;
  engineCount: number;
  entityTypes: EntityType[];
}) => {
  const { counts, isLoading } = useEntityCountsByType();
  const { color, label } = HEALTH[health];

  return (
    <EuiPanel hasBorder data-test-subj={ENTITY_STORE_OVERVIEW_TEST_ID}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiHealth color={color} textSize="m">
            <strong>{label}</strong>
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {summary(health, problemCount, engineCount)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl" wrap>
        {entityTypes.map((type) => (
          <EuiFlexItem grow={false} key={type}>
            <EuiStat
              titleSize="l"
              isLoading={isLoading}
              title={formatCount(counts[type])}
              description={
                <>
                  <EuiIcon type={getEntityIcon(type)} size="s" aria-hidden={true} />{' '}
                  {capitalize(type)}
                </>
              }
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
