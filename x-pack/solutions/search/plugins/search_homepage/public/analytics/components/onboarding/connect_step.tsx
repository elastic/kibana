/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AnalyticsEventSource,
  AnalyticsLinks,
  AnalyticsSampleData,
  ResolvedJourney,
} from '../../types';
import { AddSourceButton } from '../shared/add_source_button';
import { EventsDetectedCallout } from '../shared/event_status';
import { IngestGate } from '../shared/ingest_gate';

interface ConnectStepProps {
  links: AnalyticsLinks;
  sampleData: AnalyticsSampleData;
  /** The journey the detected data calls for; undefined while the cluster holds no data. */
  journey: ResolvedJourney | undefined;
  /** The source data was found in; undefined when the cluster names none. */
  detectedSource: AnalyticsEventSource | undefined;
  onSampleInstalled: () => void;
  /** Opens the step that the arrival of data unlocks. */
  onContinue: () => void;
}

/** The ingest gate until data arrives, then the way to the step that the data unlocks. */
export const ConnectStep = ({
  links,
  sampleData,
  journey,
  detectedSource,
  onSampleInstalled,
  onContinue,
}: ConnectStepProps): React.JSX.Element => (
  <>
    {journey === undefined && (
      <>
        <IngestGate
          page="onboarding"
          links={links}
          sampleData={sampleData}
          onSampleInstalled={onSampleInstalled}
        />
        <EuiSpacer size="m" />
      </>
    )}
    <div role="status" aria-live="polite" data-test-subj="analyticsOnboardingEventStatus">
      {journey !== undefined && (
        <EventsDetectedCallout
          page="onboarding"
          dataKind={journey === 'analytics' ? 'events' : 'data'}
          sourceName={detectedSource?.name}
          announceOnMount={false}
          nextAction={{
            label:
              journey === 'analytics'
                ? i18n.translate(
                    'xpack.searchHomepage.analytics.onboarding.connect.exploreButton',
                    {
                      defaultMessage: 'Explore your events',
                    }
                  )
                : i18n.translate('xpack.searchHomepage.analytics.onboarding.connect.searchButton', {
                    defaultMessage: 'Try a search',
                  }),
            onClick: onContinue,
          }}
        />
      )}
    </div>
    {journey !== undefined && (
      <>
        <EuiSpacer size="m" />
        <AddSourceButton
          page="onboarding"
          name="AddSource"
          emphasis="low"
          audience={journey === 'analytics' ? 'events' : 'all'}
          links={links}
          label={
            journey === 'analytics'
              ? i18n.translate(
                  'xpack.searchHomepage.analytics.onboarding.connect.addSourceButton',
                  {
                    defaultMessage: 'Connect another source',
                  }
                )
              : i18n.translate('xpack.searchHomepage.analytics.onboarding.connect.addDataButton', {
                  defaultMessage: 'Add more data',
                })
          }
        />
      </>
    )}
  </>
);
