/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import datemath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type { Conversation } from '../../../common/conversations';

export interface ConversationGroup {
  dateLabel: string;
  conversations: Conversation[];
}

type ConversationGroupWithDate = ConversationGroup & {
  dateLimit: number;
};

const getGroups = () => {
  return [
    {
      code: 'TODAY',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.today', {
        defaultMessage: 'Today',
      }),
      limit: 'now/d',
    },
    {
      code: 'YESTERDAY',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.yesterday', {
        defaultMessage: 'Yesterday',
      }),
      limit: 'now-1d/d',
    },
    {
      code: 'THIS_WEEK',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.thisWeek', {
        defaultMessage: 'This week',
      }),
      limit: 'now/w',
    },
    {
      code: 'OLDER',
      label: i18n.translate('xpack.workchatApp.conversationGroups.labels.before', {
        defaultMessage: 'Before',
      }),
      limit: '',
    },
  ];
};

/**
 * Sort and group conversation by time period to display them in the ConversationList component.
 */
export const sortAndGroupConversations = (conversations: Conversation[]): ConversationGroup[] => {
  const now = new Date();

  const getEpochLimit = (range: string) => {
    return getAbsoluteTime(range, { forceNow: now })?.valueOf() ?? 0;
  };

  const groups = getGroups().map(({ label, limit }) => {
    return emptyGroup(label, getEpochLimit(limit));
  });

  conversations
    .map((conversation) => {
      return {
        conversation,
        date: moment(conversation.lastUpdated),
      };
    })
    .sort((conv1, conv2) => {
      return conv2.date.valueOf() - conv1.date.valueOf();
    })
    .forEach(({ conversation, date }) => {
      for (const group of groups) {
        if (date.isAfter(group.dateLimit)) {
          group.conversations.push(conversation);
          break;
        }
      }
    });

  return groups
    .filter((group) => group.conversations.length > 0)
    .map(({ conversations: convs, dateLabel }) => ({ conversations: convs, dateLabel }));
};

const emptyGroup = (label: string, limit: number): ConversationGroupWithDate => ({
  dateLabel: label,
  dateLimit: limit,
  conversations: [],
});

const getAbsoluteTime = (range: string, opts: Parameters<typeof datemath.parse>[1] = {}) => {
  const parsed = datemath.parse(range, opts);

  return parsed?.isValid() ? parsed : undefined;
};
