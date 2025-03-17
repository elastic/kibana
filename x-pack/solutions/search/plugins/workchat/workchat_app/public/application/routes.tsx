/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { WorkchatChatPage } from './pages/chat';
import { WorkChatAgentsPage } from './pages/agents';
import { WorkChatAgentEditOrCreatePage } from './pages/agent_edit_or_create';

export const WorkchatAppRoutes: React.FC<{}> = () => {
  return (
    <Routes>
      <Route path="/chat/:conversationId">
        <WorkchatChatPage />
      </Route>

      <Route path="/agents/create">
        <WorkChatAgentEditOrCreatePage />
      </Route>
      <Route path="/agents/:agentId">
        <WorkChatAgentEditOrCreatePage />
      </Route>
      <Route path="/agents" strict>
        <WorkChatAgentsPage />
      </Route>

      <Route path="/">
        <WorkchatChatPage />
      </Route>
    </Routes>
  );
};
