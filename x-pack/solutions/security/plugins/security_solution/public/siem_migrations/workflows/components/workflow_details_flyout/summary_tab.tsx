/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { SummaryTabBase } from '../../../common/components/details_flyout/tabs/summary';
import * as genericI18n from '../../../common/components/details_flyout/translation';
import { PHISHING_EMAIL_SUMMARY_COMMENTS } from '../../common/workflow_content';

export const SummaryTab: React.FC = React.memo(() => {
  const getEventDetails = useCallback(() => genericI18n.COMMENT_EVENT_TRANSLATED, []);

  return (
    <SummaryTabBase comments={PHISHING_EMAIL_SUMMARY_COMMENTS} getEventDetails={getEventDetails} />
  );
});
SummaryTab.displayName = 'SummaryTab';
