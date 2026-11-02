/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getRawData } from '../../../../assistant/helpers';
import { AIAssistantSection } from './components/ai_assistant_section';
import { AttackDiscoverySection } from './components/attack_discovery_section';
import { DocumentSummarySection } from '../../../../flyout_v2/document/main/components/document_summary_section';
import { HighlightedFields } from '../../../../flyout_v2/document/main/components/highlighted_fields';
import { noopCellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { EaseDetailsProvider, useEaseDetailsContext } from './context';
import { PanelFooter } from './footer';
import { HeaderTitle } from './components/header_title';
import { DOCUMENT_SUMMARY_SECTION_TEST_ID, FLYOUT_BODY_TEST_ID, FLYOUT_TEST_ID } from './test_ids';

const EASE_FLYOUT_ARIA_LABEL = i18n.translate('xpack.securitySolution.flyout.panelAriaLabel.ease', {
  defaultMessage: 'Alert summary',
});

/**
 * Header, body and footer of the EASE alert summary flyout. Must be rendered within the
 * EaseDetailsProvider.
 */
const EaseFlyoutContent = memo(() => {
  const { eventId, dataFormattedForFieldBrowser, investigationFields, searchHit } =
    useEaseDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser),
    [dataFormattedForFieldBrowser]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <HeaderTitle />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={FLYOUT_BODY_TEST_ID}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <DocumentSummarySection
              documentId={eventId}
              getPromptContext={getPromptContext}
              data-test-subj={DOCUMENT_SUMMARY_SECTION_TEST_ID}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <HighlightedFields
              hideEditButton={true}
              hit={hit}
              investigationFields={investigationFields}
              renderCellActions={noopCellActionRenderer}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <AttackDiscoverySection />
          </EuiFlexItem>
          <EuiFlexItem>
            <AIAssistantSection getPromptContext={getPromptContext} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <PanelFooter />
    </>
  );
});

EaseFlyoutContent.displayName = 'EaseFlyoutContent';

export interface EaseFlyoutProps {
  /**
   * Id of the alert to display
   */
  documentId: string;
  /**
   * Called when the flyout is closed
   */
  onClose: () => void;
}

/**
 * EASE alert summary flyout. The alert is fetched from the EASE alerts data view, so only its id
 * is needed.
 */
export const EaseFlyout = memo(({ documentId, onClose }: EaseFlyoutProps) => (
  <EuiFlyout
    aria-label={EASE_FLYOUT_ARIA_LABEL}
    data-test-subj={FLYOUT_TEST_ID}
    onClose={onClose}
    ownFocus
    resizable
    size="s"
  >
    <EaseDetailsProvider id={documentId}>
      <EaseFlyoutContent />
    </EaseDetailsProvider>
  </EuiFlyout>
));

EaseFlyout.displayName = 'EaseFlyout';
