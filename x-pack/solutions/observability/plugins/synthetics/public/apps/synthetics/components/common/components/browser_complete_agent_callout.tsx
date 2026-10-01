/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import type { LocationAgentStats } from '../../../../../../common/types';

const DOCS_HREF =
  'https://www.elastic.co/guide/en/observability/current/uptime-set-up-choose-agent.html#private-locations';

/**
 * Private locations that have browser monitors and no elastic-agent-complete agent.
 * Those monitors are pinned to nobody, so they do not run.
 */
export const locationLabelsWithoutCompleteAgent = (
  stats: LocationAgentStats[],
  locationMonitors: Array<{ id: string; browserCount?: number }>,
  loading: boolean
): string[] => {
  if (loading) {
    return [];
  }
  const browserLocationIds = new Set(
    locationMonitors.filter((location) => (location.browserCount ?? 0) > 0).map(({ id }) => id)
  );
  return stats
    .filter(
      (entry) =>
        browserLocationIds.has(entry.locationId) && !entry.agents.some((agent) => agent.complete)
    )
    .map((entry) => entry.locationLabel);
};

export const BrowserCompleteAgentCallout = ({
  locationLabels,
  scope,
}: {
  locationLabels: string[];
  /** `monitor` is the details/flyout copy for this one monitor. */
  scope: 'locations' | 'monitor';
}) => {
  if (locationLabels.length === 0) {
    return null;
  }

  const locations = locationLabels.join(', ');
  const description =
    scope === 'monitor'
      ? i18n.translate('xpack.synthetics.browserCompleteAgent.callout.monitorDescription', {
          defaultMessage:
            'This browser monitor is not running on {locations}. Browser monitors only run on the {code} image, and {count, plural, one {this private location has} other {these private locations have}} no agent on that image.',
          values: { locations, count: locationLabels.length, code: 'elastic-agent-complete' },
        })
      : i18n.translate('xpack.synthetics.browserCompleteAgent.callout.locationsDescription', {
          defaultMessage:
            'Browser monitors on {locations} are not running. They only run on the {code} image, and {count, plural, one {this private location has} other {these private locations have}} no agent on that image.',
          values: { locations, count: locationLabels.length, code: 'elastic-agent-complete' },
        });

  return (
    <>
      <KbnWarningCallout
        title={i18n.translate('xpack.synthetics.browserCompleteAgent.callout.title', {
          defaultMessage: 'Browser monitors need the complete agent image',
        })}
        data-test-subj="syntheticsBrowserCompleteAgentCallout"
        size="s"
      >
        {description}{' '}
        <EuiLink
          data-test-subj="syntheticsBrowserCompleteAgentDocsLink"
          href={DOCS_HREF}
          target="_blank"
          external
        >
          {i18n.translate('xpack.synthetics.browserCompleteAgent.callout.link', {
            defaultMessage: 'Read the docs',
          })}
        </EuiLink>
      </KbnWarningCallout>
      <EuiSpacer size="m" />
    </>
  );
};
