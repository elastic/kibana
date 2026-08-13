/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { isNonLocalIndexName } from '@kbn/es-query';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { EventKind } from '../constants/event_kinds';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useFlyoutApi } from '../../../use_flyout_api';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { PREFIX } from '../../../../flyout/shared/test_ids';
import { InvestigationGuide } from './investigation_guide';
import { HighlightedFields } from './highlighted_fields';
import { HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID } from './test_ids';
import { EVENT_SOURCE_FIELD_DESCRIPTOR } from '../../../../common/components/event_details/translations';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import type { OpenFlyoutLinkProps } from '../../../shared/components/open_flyout_link';
import { OpenFlyoutLink } from '../../../shared/components/open_flyout_link';
import {
  LEGACY_SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';
import { INVESTIGATION_SECTION_TITLE } from '../../../shared/constants/flyout_titles';
import { isRulePreviewDocument } from '../../../shared/utils/is_rule_preview_document';

export const INVESTIGATION_SECTION_TEST_ID = `${PREFIX}InvestigationSection` as const;

const LOCAL_STORAGE_SECTION_KEY = 'investigation';

export interface InvestigationSectionProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
  /**
   * Render function for cell actions. The caller decides what to inject
   * (real security cell actions in Security Solution, no-op in Discover).
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Second section of the overview tab in details flyout.
 * It contains investigation guide (alerts only) and highlighted fields.
 */
export const InvestigationSection = memo(
  ({ hit, renderCellActions }: InvestigationSectionProps) => {
    const { openDocumentInvestigationGuide, openDocumentFlyoutFromIndex } = useFlyoutApi();

    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );
    const isRemoteDocument = useMemo(
      () => isNonLocalIndexName(hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? ''),
      [hit]
    );
    const isRulePreview = useMemo(() => isRulePreviewDocument(hit), [hit]);
    const ruleId = useMemo(
      () =>
        (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal
          ? (getFieldValue(hit, 'kibana.alert.rule.uuid') as string)
          : (getFieldValue(hit, 'signal.rule.id') as string),
      [hit]
    );
    const { rule } = useRuleWithFallback(ruleId);
    const investigationFields = useMemo(
      () => rule?.investigation_fields?.field_names ?? [],
      [rule?.investigation_fields?.field_names]
    );
    const ancestorsIndexName = useMemo(
      () => (getFieldValue(hit, 'signal.ancestors.index') as string) ?? '',
      [hit]
    );

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: LOCAL_STORAGE_SECTION_KEY,
      defaultValue: true,
    });

    const onShowInvestigationGuide = useCallback(() => {
      openDocumentInvestigationGuide({ hit, origin: FLYOUT_ORIGIN.INVESTIGATION_GUIDE });
    }, [openDocumentInvestigationGuide, hit]);

    const renderFlyoutLink = useCallback(
      (props: OpenFlyoutLinkProps) => {
        // Source event: open the ancestor document in a new flyout. The value is the ancestor
        // document id and the index comes from `signal.ancestors.index`. Uses the same open method
        // as the sibling host/user/rule links in this table so the navigation behaves consistently.
        // Render plain text when either piece is missing.
        if (props.field === EVENT_SOURCE_FIELD_DESCRIPTOR) {
          if (!props.value || !ancestorsIndexName) {
            return <>{props.children}</>;
          }
          return (
            <EuiLink
              onClick={() =>
                openDocumentFlyoutFromIndex({
                  documentId: props.value,
                  indexName: ancestorsIndexName,
                  origin: FLYOUT_ORIGIN.FLYOUT_FIELD_LINK,
                })
              }
              data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}
            >
              {props.children}
            </EuiLink>
          );
        }
        // Rule name fields: substitute the rule UUID as the link target (the flyout is keyed by
        // UUID) while keeping the rule name as the displayed text. When no UUID is available,
        // or when in rule preview (the rule doesn't exist yet), render plain text.
        if (
          props.field === SIGNAL_RULE_NAME_FIELD_NAME ||
          props.field === LEGACY_SIGNAL_RULE_NAME_FIELD_NAME
        ) {
          if (!ruleId || isRulePreview) {
            return <>{props.children}</>;
          }
          return <OpenFlyoutLink {...props} value={ruleId} />;
        }
        return <OpenFlyoutLink {...props} />;
      },
      [ruleId, isRulePreview, ancestorsIndexName, openDocumentFlyoutFromIndex]
    );

    return (
      <ExpandableSection
        data-test-subj={INVESTIGATION_SECTION_TEST_ID}
        expanded={expanded}
        gutterSize="s"
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={LOCAL_STORAGE_SECTION_KEY}
        title={INVESTIGATION_SECTION_TITLE}
      >
        {isAlert && !isRemoteDocument ? (
          <InvestigationGuide
            hit={hit}
            isAvailable={!isRulePreview}
            onShowInvestigationGuide={onShowInvestigationGuide}
          />
        ) : null}
        <HighlightedFields
          hit={hit}
          investigationFields={investigationFields}
          ancestorsIndexName={ancestorsIndexName}
          renderCellActions={renderCellActions}
          hideEditButton={isRemoteDocument}
          renderFlyoutLink={renderFlyoutLink}
        />
      </ExpandableSection>
    );
  }
);

InvestigationSection.displayName = 'InvestigationSection';
