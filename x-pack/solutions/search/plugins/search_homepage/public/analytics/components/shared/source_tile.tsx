/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AnalyticsSource } from '../../types';
import { isIntegrationSource } from './event_source_utils';
import type { AnalyticsPageId } from './page_ids';
import { TileButton } from './tile_button';

interface SourceTileProps {
  page: AnalyticsPageId;
  /** Distinguishes the featured tiles from the same sources listed in the flyout. */
  placement: 'Featured' | 'Flyout';
  source: AnalyticsSource;
  canUseIntegrations: boolean;
  /** Set when the source opens a dialog rather than leaving the page. */
  opensDialog: boolean;
  /** Receives the tile's button, so that a source that opens a dialog can hand the focus back. */
  onSelect: (source: AnalyticsSource, button: HTMLButtonElement) => void;
}

/** One event source the user can connect; integration sources explain themselves when unavailable. */
export const SourceTile = ({
  page,
  placement,
  source,
  canUseIntegrations,
  opensDialog,
  onSelect,
}: SourceTileProps): React.JSX.Element => {
  const isDisabled = !canUseIntegrations && isIntegrationSource(source);

  const tileButton = (
    <TileButton
      page={page}
      placement={placement}
      id={source.id}
      title={source.title}
      description={source.description}
      iconType={source.iconType}
      isDisabled={isDisabled}
      opensDialog={opensDialog}
      onClick={(button) => onSelect(source, button)}
    />
  );

  if (!isDisabled) {
    return tileButton;
  }

  return (
    <EuiToolTip
      display="block"
      content={i18n.translate('xpack.searchHomepage.analytics.sourceTile.missingPrivilegeTooltip', {
        defaultMessage:
          'This source needs the Integrations privilege. Ask your administrator for access.',
      })}
    >
      {tileButton}
    </EuiToolTip>
  );
};
