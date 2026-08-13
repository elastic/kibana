/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CollectionCardItem } from './collection_card';
import { VariantChooser } from './variant_chooser';

export interface CollectionFlyoutProps {
  card: CollectionCardItem;
  onClose: () => void;
}

/**
 * The chooser surface for a grouped technology (ingest-dev#8480): design chose
 * a flyout for the Add Data page because it keeps the user in the page context.
 * The page hosts it, so surfaces other than a search result can open it too.
 */
export const CollectionFlyout = ({ card, onClose }: CollectionFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'collectionFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="collectionFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{card.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>{card.description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <VariantChooser members={card.groupMembers} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
