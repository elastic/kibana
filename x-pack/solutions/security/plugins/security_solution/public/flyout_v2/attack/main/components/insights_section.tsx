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
import { INSIGHTS_SECTION_TEST_ID } from '../constants/test_ids';
import { EntitiesOverview } from './entities_overview';
import { CorrelationsOverview } from './correlations_overview';
import { useAttackAlertIds } from '../hooks/use_attack_alert_ids';

const KEY = 'insights';
const STORAGE_KEY = 'securitySolution.attackDetailsFlyout.overviewSectionExpanded.v9.4';

export interface InsightsSectionProps {
  /** The raw attack document hit. */
  hit: DataTableRecord;
  /** Callback to show the related entities. Forwarded to EntitiesOverview. */
  onShowEntities: () => void;
  /** Callback to show the related alerts. Forwarded to CorrelationsOverview. */
  onShowCorrelations: () => void;
}

/**
 * Insights section for the attack flyout. Renders entities and correlations panels.
 * The callbacks that open the entities/correlations views are supplied by the caller so this
 * section can be reused by both the v2 flyout (system flyouts) and the legacy attack details
 * flyout (left panel tabs).
 */
export const InsightsSection = memo(
  ({ hit, onShowEntities, onShowCorrelations }: InsightsSectionProps) => {
    const expanded = useExpandSection({
      storageKey: STORAGE_KEY,
      title: KEY,
      defaultValue: false,
    });

    const alertIds = useAttackAlertIds(hit);

    return (
      <ExpandableSection
        expanded={expanded}
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.attack.overview.insightsSection.sectionTitle"
            defaultMessage="Insights"
          />
        }
        localStorageKey={STORAGE_KEY}
        sectionId={KEY}
        gutterSize="s"
        data-test-subj={INSIGHTS_SECTION_TEST_ID}
      >
        <EntitiesOverview alertIds={alertIds} onShowEntities={onShowEntities} />
        <CorrelationsOverview alertIds={alertIds} onShowCorrelations={onShowCorrelations} />
      </ExpandableSection>
    );
  }
);

InsightsSection.displayName = 'InsightsSection';
