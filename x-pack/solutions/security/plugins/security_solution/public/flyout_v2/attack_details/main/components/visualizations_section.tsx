/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { AttackChain } from '../../../../attack_discovery/pages/results/attack_discovery_panel/tabs/attack_discovery_tab/attack/attack_chain';

const KEY = 'visualizations';

const TACTICS_FIELD = 'kibana.alert.attack_discovery.mitre_attack_tactics' as const;

export interface VisualizationsSectionProps {
  /**
   * The attack-discovery document hit. The MITRE ATT&CK tactics array is
   * read directly from `hit.flattened` since `getFieldValue` would only
   * return the first tactic.
   */
  hit: DataTableRecord;
}

/**
 * Renders the Overview tab - VisualizationsSection content in the Attack Details flyout.
 */
export const VisualizationsSection = memo(({ hit }: VisualizationsSectionProps) => {
  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: KEY,
    defaultValue: false,
  });

  const tacticsField = useMemo(
    () => hit.flattened[TACTICS_FIELD] as AttackDiscovery['mitreAttackTactics'],
    [hit]
  );

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.attackDetailsFlyout.overview.visualizationsSection.sectionTitle"
          defaultMessage="Visualizations"
        />
      }
      localStorageKey={FLYOUT_STORAGE_KEYS.ATTACK_DETAILS_OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={KEY}
      gutterSize="s"
      data-test-subj={KEY}
    >
      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.attackDetailsFlyout.overview.visualizationsSection.attackChainTitle"
              defaultMessage="Attack Chain"
            />
          ),
        }}
      >
        <AttackChain isVertical attackTactics={tacticsField} />
      </ExpandablePanel>
      <EuiSpacer size="s" />
    </ExpandableSection>
  );
});

VisualizationsSection.displayName = 'VisualizationsSection';
