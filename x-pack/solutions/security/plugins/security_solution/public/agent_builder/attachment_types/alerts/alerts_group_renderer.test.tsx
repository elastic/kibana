/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { of } from 'rxjs';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { createAlertsGroupRenderer } from './alerts_group_renderer';

jest.mock('../grouped_attachments/flyout_opener', () => ({
  GroupedAttachmentFlyoutOpener: () => null,
}));

const getUrlForApp = jest.fn(() => '/app/security/alerts?filters=x');
const application = { getUrlForApp } as never;
const getSpaceId = jest.fn().mockResolvedValue('default');
const resolveSecurityCanvasContext = jest.fn();
const search = jest.fn(() =>
  of({
    rawResponse: {
      hits: { hits: [{ _source: { 'kibana.alert.rule.name': 'Service-account logons' } }] },
    },
  })
);

const Renderer = createAlertsGroupRenderer({
  application,
  getSpaceId,
  search: search as never,
  resolveSecurityCanvasContext,
});

const batch = (alertIds: string[]): UnknownAttachment => ({
  id: 'attachment-batch',
  type: SecurityAgentBuilderAttachments.alerts,
  data: { alertIds },
});

describe('createAlertsGroupRenderer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the Alerts page in a new tab for several alerts', async () => {
    render(
      <ul>
        <Renderer attachments={[batch(['a', 'b', 'c', 'd', 'e'])]} />
      </ul>
    );

    const link = await screen.findByRole('link');
    expect(screen.getByText('5 alerts')).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/security/alerts?filters=x');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('titles the single alert with its rule name and opens the flyout rather than a page', async () => {
    render(
      <ul>
        <Renderer attachments={[batch(['a'])]} />
      </ul>
    );

    expect(await screen.findByText('Service-account logons')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(getUrlForApp).not.toHaveBeenCalled();
  });

  it('uses the rule name the attachment already carries without searching', async () => {
    render(
      <ul>
        <Renderer
          attachments={[
            {
              id: 'attachment-alert',
              type: SecurityAgentBuilderAttachments.alert,
              data: {
                alert: JSON.stringify({
                  _id: ['a'],
                  _index: ['.alerts-1'],
                  'kibana.alert.rule.name': ['Known rule'],
                }),
              },
            },
          ]}
        />
      </ul>
    );

    expect(await screen.findByText('Known rule')).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });

  it('renders nothing until the space is known', () => {
    getSpaceId.mockReturnValueOnce(new Promise(() => {}));

    const { container } = render(
      <ul>
        <Renderer attachments={[batch(['a', 'b'])]} />
      </ul>
    );

    expect(container.querySelector('li')).toBeNull();
  });
});
