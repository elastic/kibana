/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { AnalyticsLinks, AnalyticsSourceAudience } from '../../types';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { SourcesFlyout } from './sources_flyout';

interface AddSourceButtonProps {
  page: AnalyticsPageId;
  /** Names the control in test ids and telemetry, e.g. `MoreSources`. */
  name: string;
  label: string;
  emphasis: 'low' | 'medium';
  /** `events` lists streams first and leaves out the ways to add search content. */
  audience: AnalyticsSourceAudience;
  links: Pick<
    AnalyticsLinks,
    'canUseIntegrations' | 'isSourceAvailable' | 'openSource' | 'browseIntegrations'
  >;
}

/** Opens the full list of ways to add data in a flyout. */
export const AddSourceButton = ({
  page,
  name,
  label,
  emphasis,
  audience,
  links,
}: AddSourceButtonProps): React.JSX.Element => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const buttonProps = {
    iconType: 'plusCircle',
    onClick: () => setIsFlyoutOpen(true),
    'data-test-subj': getPageTestSubj(page, name),
    'data-telemetry-id': getPageTelemetryId(
      page,
      `${name.charAt(0).toLowerCase()}${name.slice(1)}`
    ),
  };

  return (
    <>
      {emphasis === 'low' ? (
        <EuiButtonEmpty {...buttonProps}>{label}</EuiButtonEmpty>
      ) : (
        <EuiButton {...buttonProps}>{label}</EuiButton>
      )}
      {isFlyoutOpen && (
        <SourcesFlyout
          page={page}
          audience={audience}
          links={links}
          onClose={() => setIsFlyoutOpen(false)}
        />
      )}
    </>
  );
};
