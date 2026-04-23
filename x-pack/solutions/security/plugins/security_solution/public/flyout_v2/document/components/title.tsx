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
import { isNonLocalIndexName } from '@kbn/es-query';
import { ALERT_RULE_UUID, EVENT_KIND } from '@kbn/rule-data-utils';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { EventKind } from '../constants/event_kinds';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { getDocumentTitle } from '../utils/get_header_title';
import { getRuleDetailsUrl } from '../../../common/components/link_to';
import { useKibana } from '../../../common/lib/kibana';
import { TITLE_LINK_TEST_ID, TITLE_TEST_ID } from './test_ids';

export interface TitleProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Optional boolean to suppress the rule details link even when a rule ID is present.
   * Should be used when the component is displayed in a rule preview context.
   */
  hideLink?: boolean;
}

/**
 * Flyout header title component that displays the document title with an appropriate icon.
 * For alerts: shows the rule name with a warning icon, linked to the rule details page.
 * For events: shows the event title with an analyzeEvent icon.
 */
export const Title: FC<TitleProps> = memo(({ hit, hideLink = false }) => {
  const { services } = useKibana();

  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );
  const title = useMemo(() => getDocumentTitle(hit), [hit]);
  const iconType = isAlert ? 'warning' : 'analyzeEvent';

  const isRemoteDocument = useMemo(
    () => isNonLocalIndexName(hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? ''),
    [hit]
  );

  const ruleId = useMemo(
    () => (getFieldValue(hit, ALERT_RULE_UUID) as string | null) ?? null,
    [hit]
  );

  const titleHref = useMemo(() => {
    if (hideLink || isRemoteDocument || !ruleId) return undefined;
    const path = getRuleDetailsUrl(ruleId);
    return services.application.getUrlForApp('securitySolutionUI', {
      deepLinkId: SecurityPageName.rules,
      path,
    });
  }, [hideLink, isRemoteDocument, ruleId, services.application]);

  if (titleHref) {
    return (
      <EuiLink
        href={titleHref}
        target="_blank"
        external={false}
        data-test-subj={TITLE_LINK_TEST_ID}
      >
        <FlyoutTitle title={title} iconType={iconType} isLink data-test-subj={TITLE_TEST_ID} />
      </EuiLink>
    );
  }

  return <FlyoutTitle title={title} iconType={iconType} data-test-subj={TITLE_TEST_ID} />;
});

Title.displayName = 'Title';
