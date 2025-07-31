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
import { UserAvatar } from '@kbn/user-profile-components';
import { USER_AVATAR_ITEM_TEST_ID } from '../../../../../../common/components/user_profiles/test_ids';
import { useBulkGetUserProfiles } from '../../../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import { type RuleMigrationRule } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';
import {
  RuleTranslationResult,
  SIEM_MIGRATIONS_ASSISTANT_USER,
} from '../../../../../../../common/siem_migrations/constants';
import * as i18n from './translations';

interface SummaryTabProps {
  migrationRule: RuleMigrationRule;
}

export const SummaryTab: React.FC<SummaryTabProps> = React.memo(({ migrationRule }) => {
  const userProfileIds = useMemo<Set<string>>(() => {
    if (!migrationRule.comments) {
      return new Set();
    }
    return migrationRule.comments.reduce((acc, { created_by: createdBy }) => {
      if (createdBy !== SIEM_MIGRATIONS_ASSISTANT_USER) acc.add(createdBy);
      return acc;
    }, new Set<string>());
  }, [migrationRule.comments]);
  const { isLoading: isLoadingUserProfiles, data: userProfiles } = useBulkGetUserProfiles({
    uids: userProfileIds,
  });

  const comments: EuiCommentProps[] | undefined = useMemo(() => {
    if (isLoadingUserProfiles) {
      return undefined;
    }
    return migrationRule.comments?.map(
      ({ message, created_at: createdAt, created_by: createdBy }) => {
        const profile = userProfiles?.find(({ uid }) => uid === createdBy);
        const isCreatedByAssistant = createdBy === SIEM_MIGRATIONS_ASSISTANT_USER || !profile;
        const username = isCreatedByAssistant
          ? i18n.ASSISTANT_USERNAME
          : profile.user.full_name ?? profile.user.username;
        return {
          username,
          timelineAvatarAriaLabel: username,
          timelineAvatar: isCreatedByAssistant ? (
            <AssistantAvatar name="machine" size="l" color="subdued" />
          ) : (
            <UserAvatar
              data-test-subj={USER_AVATAR_ITEM_TEST_ID(username)}
              user={profile?.user}
              avatar={profile?.data.avatar}
              size={'l'}
            />
          ),
          event:
            migrationRule.translation_result === RuleTranslationResult.UNTRANSLATABLE
              ? i18n.COMMENT_EVENT_UNTRANSLATABLE
              : i18n.COMMENT_EVENT_TRANSLATED,
          timestamp: moment(createdAt).format('ll'), // Date formats https://momentjs.com/docs/#/displaying/format/
          children: <EuiMarkdownFormat textSize="s">{message}</EuiMarkdownFormat>,
        };
      }
    );
  }, [
    isLoadingUserProfiles,
    migrationRule.comments,
    migrationRule.translation_result,
    userProfiles,
  ]);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCommentList comments={comments} aria-label={i18n.ASSISTANT_COMMENTS} />
    </>
  );
});
SummaryTab.displayName = 'SummaryTab';
