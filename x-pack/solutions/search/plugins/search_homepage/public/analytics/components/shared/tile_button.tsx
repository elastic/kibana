/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { disabledTile, tile, tileTitle } from './shared_styles';

interface TileButtonProps {
  page: AnalyticsPageId;
  /** Distinguishes the featured tiles from the same choices listed in the flyout. */
  placement: 'Featured' | 'Flyout';
  id: string;
  title: string;
  description: string;
  iconType: IconType;
  /** Keeps the tile focusable, so that what surrounds it can say why it does nothing. */
  isDisabled?: boolean;
  /** Set when the tile opens a dialog rather than leaving the page. */
  opensDialog?: boolean;
  /** Receives the button, so that focus can be handed back to it. */
  onClick: (button: HTMLButtonElement) => void;
}

/** A way to add data as a button: an icon, a title and a line of description. */
export const TileButton = ({
  page,
  placement,
  id,
  title,
  description,
  iconType,
  isDisabled = false,
  opensDialog = false,
  onClick,
}: TileButtonProps): React.JSX.Element => (
  <EuiPanel
    hasBorder
    paddingSize="m"
    css={isDisabled ? disabledTile : tile}
    element="button"
    onClick={({ currentTarget }: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        onClick(currentTarget);
      }
    }}
    aria-disabled={isDisabled || undefined}
    aria-haspopup={opensDialog ? 'dialog' : undefined}
    data-test-subj={getPageTestSubj(page, `${placement}Source-${id}`)}
    data-telemetry-id={getPageTelemetryId(page, `source-${id}`)}
  >
    <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="l" aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s" css={tileTitle}>
          {title}
        </EuiText>
        <EuiText size="xs" color={isDisabled ? undefined : 'subdued'}>
          {description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
