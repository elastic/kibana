/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { screen, waitFor, render } from '@testing-library/react';
import { type PageAttachmentPersistedState, PAGE_ATTACHMENT_TYPE } from '@kbn/observability-schema';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { getPageAttachmentType } from './attachment';

jest.mock('../../utils/kibana_react', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        navigateToUrl: jest.fn(),
      },
      http: {
        externalUrl: { isInternalUrl: jest.fn().mockReturnValue(true) },
      },
      notifications: { toasts: { addDanger: jest.fn() } },
    },
  }),
}));

describe('getPageAttachmentType', () => {
  const state: PageAttachmentPersistedState = {
    type: 'exampleType',
    url: {
      pathAndQuery: '/test/path?query=1',
      iconType: 'link',
      actionLabel: 'View in Dashboards',
      label: 'Test Link',
    },
  };
  const attachmentViewProps: PersistableStateAttachmentViewProps = {
    persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
    persistableStateAttachmentState: state,
    attachmentId: 'test',
    caseData: { title: 'Test Case', id: 'case-id' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the attachment type correctly', () => {
    const linkType = getPageAttachmentType();

    expect(linkType).toStrictEqual({
      id: PAGE_ATTACHMENT_TYPE,
      icon: 'link',
      displayName: 'Page',
      getAttachmentViewObject: expect.any(Function),
      getAttachmentRemovalObject: expect.any(Function),
    });
  });

  describe('getAttachmentViewObject', () => {
    it('renders the event correctly', () => {
      const linkType = getPageAttachmentType();
      const event = linkType.getAttachmentViewObject(attachmentViewProps).event;

      expect(event).toBe('added a page');
    });

    it('renders the timelineAvatar correctly', () => {
      const linkType = getPageAttachmentType();
      const avatar = linkType.getAttachmentViewObject(attachmentViewProps).timelineAvatar;

      expect(avatar).toBe('link');
    });

    it('does not hide the default actions', () => {
      const linkType = getPageAttachmentType();
      const hideDefaultActions =
        linkType.getAttachmentViewObject(attachmentViewProps).hideDefaultActions;

      expect(hideDefaultActions).toBe(false);
    });

    it('renders the children correctly', async () => {
      const linkType = getPageAttachmentType();
      const Component = linkType.getAttachmentViewObject(attachmentViewProps).children!;

      render(
        <Suspense fallback={'Loading...'}>
          <Component {...attachmentViewProps} />
        </Suspense>
      );

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('getAttachmentRemovalObject', () => {
    it('renders the removal event correctly', () => {
      const linkType = getPageAttachmentType();
      const event = linkType.getAttachmentRemovalObject?.(attachmentViewProps);

      expect(event).toEqual({ event: 'removed page' });
    });
  });
});
