/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { DocumentSeverity } from '../../../../flyout_v2/document/components/severity';
import { FlyoutTitle } from '../../../../flyout_v2/shared/components/flyout_title';
import { getDocumentTitle } from '../../../../flyout_v2/document/utils/get_header_title';
import { HEADER_EVENT_TITLE_TEST_ID } from '../../../../flyout_v2/document/components/test_ids';

/**
 * Event details flyout right section header
 */
export const EventHeaderTitle = memo(() => {
  const { searchHit } = useDocumentDetailsContext();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const title = useMemo(() => getDocumentTitle(hit), [hit]);
  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);

  return (
    <>
      <DocumentSeverity hit={hit} />
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="xs" />
      <FlyoutTitle
        title={title}
        iconType={'analyzeEvent'}
        data-test-subj={HEADER_EVENT_TITLE_TEST_ID}
      />
    </>
  );
});

EventHeaderTitle.displayName = 'EventHeaderTitle';
