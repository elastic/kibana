/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { getDocumentTitle } from '../utils/get_header_title';
import { HEADER_TITLE_TEST_ID, HEADER_TITLE_LINK_TEST_ID } from './test_ids';

export interface HeaderTitleProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Optional link URL for the title. When provided, the title renders as a link.
   * In Discover this is undefined (plain text). In Security Solution, this links to rule details.
   */
  titleHref?: string;
}

/**
 * Flyout header title component that displays the document title with an appropriate icon.
 * For alerts: shows the rule name with a warning icon.
 * For events: shows the event title with an analyzeEvent icon.
 */
export const HeaderTitle: FC<HeaderTitleProps> = memo(({ hit, titleHref }) => {
  const isAlert = useMemo(() => (getFieldValue(hit, EVENT_KIND) as string) === 'signal', [hit]);
  const title = useMemo(() => getDocumentTitle(hit), [hit]);
  const iconType = isAlert ? 'warning' : 'analyzeEvent';

  if (titleHref) {
    return (
      <EuiLink
        href={titleHref}
        target="_blank"
        external={false}
        data-test-subj={HEADER_TITLE_LINK_TEST_ID}
      >
        <FlyoutTitle
          title={title}
          iconType={iconType}
          isLink
          data-test-subj={HEADER_TITLE_TEST_ID}
        />
      </EuiLink>
    );
  }

  return <FlyoutTitle title={title} iconType={iconType} data-test-subj={HEADER_TITLE_TEST_ID} />;
});

HeaderTitle.displayName = 'HeaderTitle';
