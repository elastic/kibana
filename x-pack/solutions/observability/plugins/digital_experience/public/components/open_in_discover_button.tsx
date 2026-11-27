/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../ebt_constants';
import { OPEN_IN_DISCOVER_LABEL } from '../labels';

/** A small icon button that opens what a tile shows in Discover. */
export function OpenInDiscoverButton({
  href,
  tileLabel,
  tooltip = OPEN_IN_DISCOVER_LABEL,
  ebtElement,
  'data-test-subj': dataTestSubj,
}: {
  href: string;
  /** The tile it opens, named for screen readers. */
  tileLabel: string;
  /** What the tooltip and the accessible name say; "Open in Discover" unless set. */
  tooltip?: string;
  /** The page element for click tracking. */
  ebtElement: string;
  'data-test-subj': string;
}) {
  return (
    <EuiToolTip content={tooltip} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="discoverApp"
        size="xs"
        color="text"
        href={href}
        aria-label={`${tooltip}: ${tileLabel}`}
        data-test-subj={dataTestSubj}
        {...getEbtProps({
          action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_IN_DISCOVER,
          element: ebtElement,
        })}
      />
    </EuiToolTip>
  );
}
