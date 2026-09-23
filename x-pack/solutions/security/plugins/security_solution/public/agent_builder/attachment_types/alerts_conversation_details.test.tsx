/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConversationDetailsRenderProps } from '@kbn/agent-builder-browser/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  ALERTS_CONVERSATION_DETAILS_TEST_ID,
  AlertsConversationDetailsContent,
  type AlertsAttachment,
  type AlertsAttachmentData,
} from './alerts_conversation_details';

const renderDetails = (data: AlertsAttachmentData) => {
  const props: ConversationDetailsRenderProps<AlertsAttachment> = {
    attachment: {
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.alerts,
      data,
    },
  };

  return render(
    <EuiProvider>
      <I18nProvider>
        <AlertsConversationDetailsContent {...props} />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('AlertsConversationDetailsContent', () => {
  it('renders each string alert id as a list item', () => {
    renderDetails({ alertIds: ['alert-1', 'alert-2'] });

    expect(screen.getByTestId(ALERTS_CONVERSATION_DETAILS_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('alert-1')).toBeInTheDocument();
    expect(screen.getByText('alert-2')).toBeInTheDocument();
  });

  it('renders an empty list when alertIds is missing', () => {
    renderDetails({});

    const list = screen.getByTestId(ALERTS_CONVERSATION_DETAILS_TEST_ID);
    expect(list.querySelectorAll('li')).toHaveLength(0);
  });

  it('filters out non-string alertIds entries', () => {
    renderDetails({
      alertIds: ['keep-me', 42 as unknown as string, null as unknown as string, 'also-keep'],
    });

    expect(screen.getByText('keep-me')).toBeInTheDocument();
    expect(screen.getByText('also-keep')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });
});
