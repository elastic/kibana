/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { useEnabledProfilingStatus } from '../contexts/profiling_status/use_enabled_profiling_status';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { isUniversalProfilingSetupIncomplete } from '../../utils/is_universal_profiling_setup_incomplete';

export const SETUP_INCOMPLETE_CALLOUT_TITLE = i18n.translate(
  'xpack.profiling.setupIncompleteCallout.title',
  { defaultMessage: 'Universal Profiling setup is incomplete' }
);

export const SETUP_INCOMPLETE_CALLOUT_TEXT = i18n.translate(
  'xpack.profiling.setupIncompleteCallout.text',
  {
    defaultMessage:
      'Some resources Universal Profiling needs are missing or out of date. New data might not be ingested, and some views might fail to load.',
  }
);

export const SETUP_INCOMPLETE_CALLOUT_TEXT_WITHOUT_PRIVILEGES = i18n.translate(
  'xpack.profiling.setupIncompleteCallout.textWithoutPrivileges',
  {
    defaultMessage:
      'Some resources Universal Profiling needs are missing or out of date. New data might not be ingested, and some views might fail to load. Ask an administrator with superuser permissions to complete the setup.',
  }
);

export const SETUP_INCOMPLETE_CALLOUT_ACTION = i18n.translate(
  'xpack.profiling.setupIncompleteCallout.completeSetupButton',
  { defaultMessage: 'Complete setup' }
);

/** Warns that Universal Profiling has data but its setup is incomplete, linking to the setup when
 * the user can run it. */
export function UniversalProfilingSetupIncompleteCallout() {
  const {
    data: { universalProfiling },
  } = useEnabledProfilingStatus();
  const router = useProfilingRouter();

  if (!isUniversalProfilingSetupIncomplete(universalProfiling)) {
    return null;
  }

  const canSetup = universalProfiling.canSetup === true;

  return (
    <KbnWarningCallout
      data-test-subj="profilingSetupIncompleteCallout"
      title={SETUP_INCOMPLETE_CALLOUT_TITLE}
      text={
        canSetup ? SETUP_INCOMPLETE_CALLOUT_TEXT : SETUP_INCOMPLETE_CALLOUT_TEXT_WITHOUT_PRIVILEGES
      }
      actionProps={
        canSetup
          ? {
              primary: {
                children: SETUP_INCOMPLETE_CALLOUT_ACTION,
                // The Universal Profiling tab shows the setup prompt while its setup is incomplete
                href: router.link('/add-data-instructions', {
                  query: { schema: ProfilingSchema.ECS },
                }),
                'data-test-subj': 'profilingSetupIncompleteCalloutCompleteSetupButton',
              },
            }
          : undefined
      }
      size="s"
    />
  );
}
