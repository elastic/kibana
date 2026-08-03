/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNonLocalIndexName } from '@kbn/es-query';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { FLYOUT_STORAGE_KEYS } from '../constants/local_storage';
import { useExpandSection } from '../../../shared/hooks/use_expand_section';
import { ExpandableSection } from '../../../shared/components/expandable_section';
import { EventKind } from '../constants/event_kinds';
import { RESPONSE_BUTTON_TEST_ID, RESPONSE_SECTION_TEST_ID } from './test_ids';

const KEY = 'response';

export interface ResponseSectionContentProps {
  /**
   * Document to display in the overview tab.
   */
  hit: DataTableRecord;
  /**
   * Whether the flyout is opened in rule preview mode.
   */
  isRulePreview?: boolean;
  /**
   * Callback to show Response details. The host (Flyout v2 or legacy expandable flyout)
   * decides whether this opens a tools flyout or navigates to the legacy left panel.
   */
  onShowResponseDetails: () => void;
}

/**
 * Renders the Response overview section. Host-agnostic: takes an `onShowResponseDetails`
 * callback so it can be reused in both Flyout v2 and the legacy expandable flyout
 * without constructing a v2 tools flyout when not needed.
 */
export const ResponseSectionContent = memo<ResponseSectionContentProps>(
  ({ hit, isRulePreview = false, onShowResponseDetails }) => {
    const indexName = useMemo(
      () => hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '',
      [hit]
    );
    const isRemoteDocument = useMemo(() => isNonLocalIndexName(indexName), [indexName]);

    const expanded = useExpandSection({
      storageKey: FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS,
      title: KEY,
      defaultValue: false,
    });
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );

    if (!isAlert || isRemoteDocument) {
      return null;
    }

    return (
      <ExpandableSection
        expanded={expanded}
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.response.sectionTitle"
            defaultMessage="Response"
          />
        }
        localStorageKey={FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS}
        sectionId={KEY}
        data-test-subj={RESPONSE_SECTION_TEST_ID}
      >
        {isRulePreview ? (
          <EuiCallOut
            announceOnMount
            iconType="documentation"
            size="s"
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyout.response.previewTitle"
                defaultMessage="Response actions"
              />
            }
            aria-label={i18n.translate('xpack.securitySolution.flyout.response.previewAriaLabel', {
              defaultMessage: 'Response actions',
            })}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.response.previewMessage"
              defaultMessage="Response is not available in alert preview."
            />
          </EuiCallOut>
        ) : (
          <EuiButton
            onClick={onShowResponseDetails}
            iconType="documentation"
            data-test-subj={RESPONSE_BUTTON_TEST_ID}
            size="s"
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.response.responseButtonLabel"
              defaultMessage="Response"
            />
          </EuiButton>
        )}
      </ExpandableSection>
    );
  }
);

ResponseSectionContent.displayName = 'ResponseSectionContent';
