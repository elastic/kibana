/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React, { memo, useCallback, useMemo } from 'react';
import { ALERT_RULE_UUID, EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { EventKind } from '../constants/event_kinds';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { isEcsAllowedValue } from '../utils/event_utils';
import { useKibana } from '../../../../common/lib/kibana';
import { flyoutProviders } from '../../../shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../shared/hooks/use_default_flyout_properties';
import { RuleDetails } from '../../../rule/main';
import { AlertDescription } from './alert_description';
import { AlertReason } from './alert_reason';
import { AlertStatus } from './alert_status';
import { MitreAttack } from './mitre_attack';
import { EventCategoryDescription } from './event_category_description';
import { EventKindDescription } from './event_kind_description';
import { EventRenderer } from './event_renderer';

export const ABOUT_SECTION_TEST_ID = `${PREFIX}AboutSection` as const;

export const ABOUT_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.about.sectionTitle',
  {
    defaultMessage: 'About',
  }
);

const LOCAL_STORAGE_SECTION_KEY = 'about';

export interface AboutSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
}

/**
 * Most top section of the overview tab.
 * For alerts (event.kind is signal), it contains the description, reason and mitre attack information.
 * For generic events (event.kind is event), it shows the event category description and event renderer.
 * For all other events, it shows the event kind description, a list of event categories and event renderer.
 */
export const AboutSection = memo(({ hit }: AboutSectionProps) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const eventKind = useMemo(() => getFieldValue(hit, EVENT_KIND) as string, [hit]);
  const isAlert = eventKind === EventKind.signal;
  const eventKindInECS = eventKind ? isEcsAllowedValue(EVENT_KIND, eventKind) : false;

  const ruleId = useMemo(
    () => (isAlert ? (getFieldValue(hit, ALERT_RULE_UUID) as string) : undefined),
    [hit, isAlert]
  );

  const onShowRuleSummary = useCallback(() => {
    overlays.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <RuleDetails ruleId={ruleId} />,
      }),
      {
        ...defaultDocumentFlyoutProperties,
        session: 'inherit',
      }
    );
  }, [defaultDocumentFlyoutProperties, history, overlays, ruleId, services, store]);

  const expanded = useExpandSection({
    storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
    title: LOCAL_STORAGE_SECTION_KEY,
    defaultValue: true,
  });

  return (
    <ExpandableSection
      data-test-subj={ABOUT_SECTION_TEST_ID}
      expanded={expanded}
      gutterSize="none"
      localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
      sectionId={LOCAL_STORAGE_SECTION_KEY}
      title={ABOUT_SECTION_TITLE}
    >
      {isAlert ? (
        <>
          <EuiFlexItem grow={false}>
            <AlertDescription
              hit={hit}
              onShowRuleSummary={ruleId ? onShowRuleSummary : undefined}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertReason hit={hit} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MitreAttack hit={hit} />
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertStatus hit={hit} />
          </EuiFlexItem>
        </>
      ) : (
        <>
          {eventKindInECS &&
            (eventKind === EventKind.event ? (
              <EuiFlexItem grow={false}>
                <EventCategoryDescription hit={hit} />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false}>
                <EventKindDescription hit={hit} />
              </EuiFlexItem>
            ))}
          <EuiFlexItem grow={false}>
            <EventRenderer hit={hit} />
          </EuiFlexItem>
        </>
      )}
    </ExpandableSection>
  );
});

AboutSection.displayName = 'AboutSection';
