/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { RemoteDocumentCallout } from '../document/components/remote_document_callout';
import { ATTACK_DETAILS_FLYOUT_TEST_ID } from './constants/test_ids';
import { AttackDetailsProvider } from './context';
import { Content } from './content';
import { Footer } from './footer';
import { Header } from './header';
import { useTabs } from './hooks/use_tabs';

export interface AttackDetailsProps {
  /**
   * The document hit corresponding to the attack-discovery alert opened in
   * the v2 document flyout.
   */
  hit: DataTableRecord;
  /**
   * Callback fired when the user opens the notes sub-flyout from the header.
   * Wired to the same `overlays.openSystemFlyout(<NotesDetails/>)` flow used
   * by the regular document flyout.
   */
  onShowNotes: () => void;
}

/**
 * v2 attack details flyout content. Rendered inside the v2 document flyout
 * surface when the document hit is detected as an attack-discovery alert.
 *
 * The legacy expandable-flyout exposed three panels (right / left / preview);
 * this v2 surface implements the right panel only. Left + preview behaviour
 * is intentionally omitted (see PR description / spec scope) and the
 * "expand" affordances on the legacy right panel (entities chevron,
 * correlations chevron, header notes link) have been replaced with
 * Discover-friendly equivalents (notes opens via `onShowNotes`; the others
 * are dropped because there is no left-panel target in v2).
 */
const AttackDetailsInner: FC<{ onShowNotes: () => void }> = memo(({ onShowNotes }) => {
  const { tabsDisplayed, selectedTabId, setSelectedTabId } = useTabs();

  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj={ATTACK_DETAILS_FLYOUT_TEST_ID}>
        <Header
          selectedTabId={selectedTabId}
          setSelectedTabId={setSelectedTabId}
          tabs={tabsDisplayed}
          onShowNotes={onShowNotes}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <Footer />
      </EuiFlyoutFooter>
    </>
  );
});

AttackDetailsInner.displayName = 'AttackDetailsInner';

export const AttackDetails: FC<AttackDetailsProps> = memo(({ hit, onShowNotes }) => (
  <>
    <RemoteDocumentCallout hit={hit} />
    <AttackDetailsProvider hit={hit}>
      <AttackDetailsInner onShowNotes={onShowNotes} />
    </AttackDetailsProvider>
  </>
));

AttackDetails.displayName = 'AttackDetails';
