/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { LifecycleView } from '../../components/lifecycle_view';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { decodeAlertId } from './helpers/decode_alert_id';
import * as i18n from './translations';

interface ExecutionsPageParams {
  correlationId?: string;
}

/**
 * `/executions/:correlationId` — the four-phase lifecycle of one attack discovery, full
 * width.
 *
 * The rows themselves live in `LifecycleView`, which knows nothing about its container, so this page
 * and the overlay (`LifecycleFlyoutHost`) render exactly the same lifecycle. Reached from the
 * overlay's "Open full page", from a bookmark, or from a link pasted into a chat.
 *
 * `/executions` with no id also lands here: the view asks for a discovery rather than reading
 * anything.
 */
export const ExecutionsPage: React.FC = () => {
  const { correlationId } = useParams<ExecutionsPageParams>();
  usePndDocTitle(i18n.PAGE_TITLE);

  const decodedAlertId = decodeAlertId(correlationId);

  return (
    <PndPageSection>
      <PndPageHeader
        subtitle={
          decodedAlertId != null ? i18n.subtitleForAlert(decodedAlertId) : i18n.PAGE_SUBTITLE
        }
        title={i18n.PAGE_TITLE}
      />
      <LifecycleView correlationId={decodedAlertId} />
    </PndPageSection>
  );
};
