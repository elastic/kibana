/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NEVER, of, throwError } from 'rxjs';
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
    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: expect.stringMatching(/^\/alerts\?/),
    });
    expect(link).toHaveAttribute('href', '/app/security/alerts?filters=x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(search).not.toHaveBeenCalled();
  });

  it('names the Security default data view of the space in the link filter', async () => {
    render(
      <ul>
        <Renderer attachments={[batch(['a', 'b'])]} />
      </ul>
    );

    await screen.findByRole('link');
    expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: expect.stringContaining('index:security-solution-default'),
    });
  });

  it('counts the alerts without a link when their ids make the URL too long', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => i.toString(16).padStart(64, '0'));

    render(
      <ul>
        <Renderer attachments={[batch(ids)]} />
      </ul>
    );

    expect(await screen.findByText('150 alerts')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(getUrlForApp).not.toHaveBeenCalled();
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

  describe('when a batch references alerts by tag', () => {
    const countSearch = jest.fn();
    const TaggedRenderer = createAlertsGroupRenderer({
      application,
      getSpaceId,
      search: countSearch as never,
      resolveSecurityCanvasContext,
    });
    const tagged: UnknownAttachment = {
      id: 'attachment-tagged',
      type: SecurityAgentBuilderAttachments.alerts,
      data: { tags: ['az:proposal:p1'] },
    };

    it('titles the row with the count of tagged alerts and links to them by tag', async () => {
      countSearch.mockReturnValue(
        of({ rawResponse: { hits: { total: { value: 12, relation: 'eq' }, hits: [] } } })
      );

      render(
        <ul>
          <TaggedRenderer attachments={[tagged]} />
        </ul>
      );

      expect(await screen.findByText('12 alerts')).toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute('href', '/app/security/alerts?filters=x');
      expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: expect.stringContaining('kibana.alert.workflow_tags'),
      });
    });

    it('shows a generic title while the tagged alerts are counted', async () => {
      countSearch.mockReturnValue(NEVER);

      render(
        <ul>
          <TaggedRenderer attachments={[tagged]} />
        </ul>
      );

      expect(await screen.findByText('Alerts')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('counts the tagged alerts without a link when the tags make the URL too long', async () => {
      countSearch.mockReturnValue(
        of({ rawResponse: { hits: { total: { value: 4, relation: 'eq' }, hits: [] } } })
      );

      render(
        <ul>
          <TaggedRenderer
            attachments={[
              {
                id: 'attachment-long-tags',
                type: SecurityAgentBuilderAttachments.alerts,
                data: { tags: Array.from({ length: 10 }, (_, i) => `${i}${'界'.repeat(255)}`) },
              },
            ]}
          />
        </ul>
      );

      expect(await screen.findByText('4 alerts')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('keeps the generic title and the link when the count fails', async () => {
      const warn = jest.spyOn(window.console, 'warn').mockImplementation(() => {});
      countSearch.mockReturnValue(throwError(() => new Error('search failed')));

      render(
        <ul>
          <TaggedRenderer attachments={[tagged]} />
        </ul>
      );

      expect(await screen.findByText('Alerts')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
      warn.mockRestore();
    });

    it('counts and links one listed alert together with the tagged ones, not as a single alert', async () => {
      countSearch.mockReturnValue(
        of({ rawResponse: { hits: { total: { value: 3, relation: 'eq' }, hits: [] } } })
      );

      render(
        <ul>
          <TaggedRenderer
            attachments={[
              {
                id: 'attachment-mixed',
                type: SecurityAgentBuilderAttachments.alerts,
                data: { alertIds: ['a'], tags: ['az:proposal:p1'] },
              },
            ]}
          />
        </ul>
      );

      expect(await screen.findByText('3 alerts')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
      expect(getUrlForApp).toHaveBeenCalledWith('securitySolutionUI', {
        path: expect.stringMatching(/values:!\(a\).*kibana\.alert\.workflow_tags/),
      });
    });
  });
});
