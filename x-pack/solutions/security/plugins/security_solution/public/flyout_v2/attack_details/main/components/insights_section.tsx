/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { INSIGHTS_SECTION_TEST_ID } from '../constants/test_ids';
import { CorrelationsOverview } from './correlations_overview';
import { EntitiesOverview } from './entities_overview';

const KEY = 'insights';

export interface InsightsSectionProps {
  /**
   * The attack-discovery document hit. Forwarded to `EntitiesOverview` and
   * `CorrelationsOverview` so they can drive their counts off the hit.
   */
  hit: DataTableRecord;
  /**
   * Callback to open the attack-specific Entities child flyout. Forwarded
   * to {@link EntitiesOverview} as its title-link callback.
   */
  onShowAttackEntities: () => void;
  /**
   * Callback to open the attack-specific Correlations child flyout.
   * Forwarded to {@link CorrelationsOverview} as its title-link callback.
   */
  onShowAttackCorrelations: () => void;
}

/**
 * Renders the Overview tab - InsightsSection content in the Attack Details flyout.
 */
export const InsightsSection: React.FC<InsightsSectionProps> = memo(
  ({ hit, onShowAttackEntities, onShowAttackCorrelations }) => {
    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: KEY,
      defaultValue: false,
    });

    return (
      <ExpandableSection
        expanded={expanded}
        title={
          <FormattedMessage
            id="xpack.securitySolution.attackDetailsFlyout.overview.insightsSection.sectionTitle"
            defaultMessage="Insights"
          />
        }
        localStorageKey={FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={KEY}
        gutterSize="s"
        data-test-subj={INSIGHTS_SECTION_TEST_ID}
      >
        <EntitiesOverview hit={hit} onShowAttackEntities={onShowAttackEntities} />
        <CorrelationsOverview hit={hit} onShowAttackCorrelations={onShowAttackCorrelations} />
      </ExpandableSection>
    );
  }
);

InsightsSection.displayName = 'InsightsSection';
