/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { MobileAvailability } from '../../../../common/types/applications';

/** Mobile applications are in their own table only, not in the totals or the chart. */
export const MobileAvailabilityCallOut = ({
  availability,
}: {
  availability: MobileAvailability;
}) => {
  if (availability === 'unavailable') {
    return (
      <KbnWarningCallout
        data-test-subj="digitalExperienceUnavailableMobile"
        size="s"
        title={i18n.translate('xpack.digitalExperience.applications.unavailableMobile', {
          defaultMessage: 'Could not load the mobile data, so the mobile applications are missing.',
        })}
      />
    );
  }
  if (availability === 'partial') {
    return (
      <KbnWarningCallout
        data-test-subj="digitalExperiencePartiallyAvailableMobile"
        size="s"
        title={i18n.translate('xpack.digitalExperience.applications.partiallyAvailableMobile', {
          defaultMessage:
            "You can't read all of the mobile indices, so the mobile applications may be incomplete. Ask an administrator for read access to them.",
        })}
      />
    );
  }
  return null;
};
