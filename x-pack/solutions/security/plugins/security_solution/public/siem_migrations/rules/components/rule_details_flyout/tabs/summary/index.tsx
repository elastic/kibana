/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiCommentList, EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import { AssistantAvatar } from '@kbn/ai-assistant-icon';
import { type RuleMigration } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { RuleTranslationResult } from '../../../../../../../common/siem_migrations/constants';
import * as i18n from './translations';

interface SummaryTabProps {
  ruleMigration: RuleMigration;
}

export const SummaryTab: React.FC<SummaryTabProps> = React.memo(({ ruleMigration }) => {
  const timestamp = useMemo(
    // Date formats https://momentjs.com/docs/#/displaying/format/
    () => moment(ruleMigration['@timestamp']).format('ll'),
    [ruleMigration]
  );
  const comments: EuiCommentProps[] | undefined = useMemo(() => {
    return ruleMigration.comments?.map((comment) => {
      return {
        username: i18n.ASSISTANT_USERNAME,
        timelineAvatarAriaLabel: i18n.ASSISTANT_USERNAME,
        timelineAvatar: <AssistantAvatar name="machine" size="l" color="subdued" />,
        event:
          ruleMigration.translation_result === RuleTranslationResult.UNTRANSLATABLE
            ? i18n.COMMENT_EVENT_UNTRANSLATABLE
            : i18n.COMMENT_EVENT_TRANSLATED,
        timestamp,
        children: <EuiMarkdownFormat textSize="s">{comment}</EuiMarkdownFormat>,
      };
    });
  }, [ruleMigration, timestamp]);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCommentList comments={comments} aria-label={i18n.ASSISTANT_COMMENTS} />
    </>
  );
});
SummaryTab.displayName = 'SummaryTab';
