/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateConversationSchema } from './update_conversation';

export const getUpdateScript = ({ conversation }: { conversation: UpdateConversationSchema }) => {
  // https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-text#update-script
  // Cannot use script for bulk update of the documents with semantic_text fields
  return {
    doc: conversation,
  };
};
