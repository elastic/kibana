/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { INSIGHTS_SECTION_TEST_ID } from '../constants/test_ids';
import { EntitiesOverview } from './entities_overview';
import { CorrelationsOverview } from './correlations_overview';

const KEY = 'insights';
const STORAGE_KEY = 'securitySolution.attackDetailsFlyout.overviewSectionExpanded.v9.4';
const FIELD_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids' as const;

export interface InsightsSectionProps {
  /** The raw attack document hit. */
  hit: DataTableRecord;
  /** Optional callback to open the entities left panel. Forwarded to EntitiesOverview. */
  onOpenEntitiesLeftPanel?: () => void;
  /** Optional callback to open the correlations left panel. Forwarded to CorrelationsOverview. */
  onOpenCorrelationsLeftPanel?: () => void;
}

/**
 * Insights section for the attack flyout. Renders entities and correlations panels.
 */
export const InsightsSection = memo(
  ({ hit, onOpenEntitiesLeftPanel, onOpenCorrelationsLeftPanel }: InsightsSectionProps) => {
    const expanded = useExpandSection({
      storageKey: STORAGE_KEY,
      title: KEY,
      defaultValue: false,
    });

    const alertIds = useMemo(() => {
      const value = hit.flattened[FIELD_ALERT_IDS];
      if (!value) return [];
      const arr = Array.isArray(value) ? value : [value];
      return [...new Set(arr as string[])];
    }, [hit]);

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
        <EntitiesOverview alertIds={alertIds} onOpenLeftPanel={onOpenEntitiesLeftPanel} />
        <CorrelationsOverview alertIds={alertIds} onOpenLeftPanel={onOpenCorrelationsLeftPanel} />
      </ExpandableSection>
    );
  }
);

InsightsSection.displayName = 'InsightsSection';
