/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { AnalyticsPageId } from './page_ids';
import { getPageTestSubj } from './page_ids';

interface IllustrativeIndexNoteProps {
  page: AnalyticsPageId;
  indexPattern: string;
}

/** Tells the user that a use case's starter queries read from an index pattern they must replace. */
export const IllustrativeIndexNote = ({
  page,
  indexPattern,
}: IllustrativeIndexNoteProps): React.JSX.Element => (
  <KbnInfoCallout
    announceOnMount
    size="s"
    data-test-subj={getPageTestSubj(page, 'IllustrativeIndexNote')}
    title={i18n.translate('xpack.searchHomepage.analytics.starterQueries.illustrativeIndexNote', {
      defaultMessage:
        'These queries read from the illustrative index pattern {indexPattern}. Replace it with the name of your own event stream before running them.',
      values: { indexPattern },
    })}
  />
);
