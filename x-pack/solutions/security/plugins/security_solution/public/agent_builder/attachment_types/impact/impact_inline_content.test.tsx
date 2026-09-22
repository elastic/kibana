/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { IMPACT_ATTACHMENT_TEST_ID, ImpactInlineContent } from './impact_inline_content';
import type { ImpactAttachment, ImpactAttachmentData } from './types';

const renderContent = (data: ImpactAttachmentData) => {
  const props = {
    attachment: {
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.impact,
      data,
    },
    isSidebar: false,
  } as AttachmentRenderProps<ImpactAttachment>;
  return render(
    <I18nProvider>
      <ImpactInlineContent {...props} />
    </I18nProvider>
  );
};

const hostRow = {
  entity_type: 'host' as const,
  name: 'WKSTN-01',
  alert_count: 3,
  verdicts: { true_positive: 2, false_positive: 1, inconclusive: 0 },
};

const userRow = {
  entity_type: 'user' as const,
  name: 'jdoe',
  alert_count: 1,
  verdicts: { true_positive: 1, false_positive: 0, inconclusive: 0 },
};

describe('ImpactInlineContent', () => {
  it('renders the table with entity rows', () => {
    renderContent({ entities: [hostRow, userRow] });

    expect(screen.getByTestId(IMPACT_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('WKSTN-01')).toBeInTheDocument();
    expect(screen.getByText('jdoe')).toBeInTheDocument();
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    renderContent({ entities: [hostRow] });

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('TP')).toBeInTheDocument();
    expect(screen.getByText('FP')).toBeInTheDocument();
    expect(screen.getByText('Inc')).toBeInTheDocument();
  });

  it('shows alert count and verdict counts', () => {
    renderContent({ entities: [hostRow] });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders empty state when entities list is empty', () => {
    renderContent({ entities: [] });

    expect(screen.getByText('No impacted entities recorded.')).toBeInTheDocument();
  });

  it('renders empty state when data is missing entities', () => {
    renderContent({});

    expect(screen.getByText('No impacted entities recorded.')).toBeInTheDocument();
  });

  it('skips malformed entries that fail validation', () => {
    renderContent({
      entities: [
        hostRow,
        // entity_type is invalid — should be filtered out
        {
          entity_type: 'service' as 'host',
          name: 'svc-1',
          alert_count: 2,
          verdicts: { true_positive: 0, false_positive: 0, inconclusive: 2 },
        },
        // empty name — should be filtered out
        {
          entity_type: 'host' as const,
          name: '',
          alert_count: 1,
          verdicts: { true_positive: 0, false_positive: 0, inconclusive: 1 },
        },
      ],
    });

    expect(screen.getByText('WKSTN-01')).toBeInTheDocument();
    expect(screen.queryByText('svc-1')).not.toBeInTheDocument();
  });
});
