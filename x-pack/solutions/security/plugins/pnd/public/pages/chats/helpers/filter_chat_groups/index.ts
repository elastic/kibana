/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatGroup } from '../nest_chat_groups';

export interface FilterChatGroupsArgs {
  groups: readonly ChatGroup[];
  query: string;
}

const matches = (value: string, needle: string): boolean => value.toLowerCase().includes(needle);

/**
 * Narrows already-paged chat groups by the search box, client-side. The route
 * pages by kind; search filters the groups on the current page.
 */
export const filterChatGroups = ({ groups, query }: FilterChatGroupsArgs): ChatGroup[] => {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) {
    return [...groups];
  }

  return groups.filter(
    ({ children, parent, parentConversation }) =>
      matches(parent.title, needle) ||
      matches(parent.summary, needle) ||
      matches(parentConversation.id, needle) ||
      matches(parentConversation.correlationId, needle) ||
      children.some(
        (child) =>
          matches(child.title, needle) ||
          matches(child.description, needle) ||
          matches(child.id, needle)
      )
  );
};
