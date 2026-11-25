/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { ApplicationSource } from '../../../../common/types/applications';
import { SOURCE_LABELS } from '../../../labels';

const sourceNames = (sources: ApplicationSource[]): string =>
  sources.map((source) => SOURCE_LABELS[source]).join(', ');

/** The web sources whose search failed. */
export const UnavailableSourcesCallOut = ({ sources }: { sources: ApplicationSource[] }) => (
  <KbnWarningCallout
    data-test-subj="digitalExperienceUnavailableSources"
    size="s"
    title={i18n.translate('xpack.digitalExperience.applications.unavailableSources', {
      defaultMessage:
        "Could not load the {sources} data, so it's missing from the applications, totals and chart.",
      values: { sources: sourceNames(sources) },
    })}
  />
);

/** The web sources with indices the user can't read. */
export const PartiallyAvailableSourcesCallOut = ({ sources }: { sources: ApplicationSource[] }) => (
  <KbnWarningCallout
    data-test-subj="digitalExperiencePartiallyAvailableSources"
    size="s"
    title={i18n.translate('xpack.digitalExperience.applications.partiallyAvailableSources', {
      defaultMessage:
        "You can't read all of the {sources} indices, so the applications, totals and chart may be incomplete. Ask an administrator for read access to them.",
      values: { sources: sourceNames(sources) },
    })}
  />
);
