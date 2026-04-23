/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ISessionService } from '@kbn/data-plugin/public';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { EntityAttachment } from './types';
import { createEntityAttachmentDefinition } from './entity_attachment_definition';

const experimentalFeatures = {
  entityAttachmentRichRenderer: true,
  entityAnalyticsWatchlistEnabled: false,
  enableRiskScorePrivmonModifier: false,
} as unknown as ExperimentalFeatures;

const application = { navigateToApp: jest.fn() } as unknown as ApplicationStart;
const resolveSecurityCanvasContext = jest.fn();

const buildDefinition = ({
  withCanvas = true,
  searchSession,
}: { withCanvas?: boolean; searchSession?: ISessionService } = {}) =>
  createEntityAttachmentDefinition({
    experimentalFeatures,
    application: withCanvas ? application : undefined,
    resolveSecurityCanvasContext: withCanvas ? resolveSecurityCanvasContext : undefined,
    searchSession,
  });

const attachmentOf = (data: unknown): EntityAttachment =>
  ({ id: 'a', type: 'security.entity', data } as unknown as EntityAttachment);

describe('createEntityAttachmentDefinition', () => {
  describe('getActionButtons (Preview button)', () => {
    it('returns a single Preview button for a single host entity when Canvas is available', () => {
      const def = buildDefinition();
      const openCanvas = jest.fn();
      const buttons = def.getActionButtons!({
        attachment: attachmentOf({ identifierType: 'host', identifier: 'alpha' }),
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas,
      });

      expect(buttons).toHaveLength(1);
      expect(buttons[0].icon).toBe('eye');
      expect(buttons[0].type).toBe(ActionButtonType.SECONDARY);

      buttons[0].handler!();
      expect(openCanvas).toHaveBeenCalledTimes(1);
    });

    it('returns a Preview button for single user and service entities', () => {
      const def = buildDefinition();
      const openCanvas = jest.fn();

      for (const identifierType of ['user', 'service'] as const) {
        const buttons = def.getActionButtons!({
          attachment: attachmentOf({ identifierType, identifier: 'x' }),
          isSidebar: false,
          isCanvas: false,
          updateOrigin: jest.fn(),
          openCanvas,
        });
        expect(buttons).toHaveLength(1);
      }
    });

    it('returns no buttons for a single generic entity (no live flyout available)', () => {
      const def = buildDefinition();
      const buttons = def.getActionButtons!({
        attachment: attachmentOf({ identifierType: 'generic', identifier: 'some-resource' }),
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });
      expect(buttons).toEqual([]);
    });

    it('returns no buttons for a multi-entity attachment', () => {
      const def = buildDefinition();
      const buttons = def.getActionButtons!({
        attachment: attachmentOf({
          entities: [
            { identifierType: 'host', identifier: 'a' },
            { identifierType: 'user', identifier: 'b' },
          ],
        }),
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });
      expect(buttons).toEqual([]);
    });

    it('returns no buttons when rendered already in Canvas (no re-entry into Preview)', () => {
      const def = buildDefinition();
      const buttons = def.getActionButtons!({
        attachment: attachmentOf({ identifierType: 'host', identifier: 'alpha' }),
        isSidebar: false,
        isCanvas: true,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });
      expect(buttons).toEqual([]);
    });

    it('returns no buttons when openCanvas is not provided', () => {
      const def = buildDefinition();
      const buttons = def.getActionButtons!({
        attachment: attachmentOf({ identifierType: 'host', identifier: 'alpha' }),
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        // openCanvas intentionally omitted
      });
      expect(buttons).toEqual([]);
    });
  });

  describe('canvas availability', () => {
    it('omits renderCanvasContent + getActionButtons when application or resolver is missing', () => {
      const def = buildDefinition({ withCanvas: false });
      expect(def.renderCanvasContent).toBeUndefined();
      expect(def.getActionButtons).toBeUndefined();
    });

    it('registers renderCanvasContent + getActionButtons when both application and resolver are provided', () => {
      const def = buildDefinition();
      expect(def.renderCanvasContent).toBeInstanceOf(Function);
      expect(def.getActionButtons).toBeInstanceOf(Function);
    });
  });

  describe('searchSession threading', () => {
    const renderProps = {
      attachment: attachmentOf({ identifierType: 'host', identifier: 'alpha' }),
      isSidebar: false,
      isCanvas: true,
      updateOrigin: jest.fn(),
    } as unknown as Parameters<
      NonNullable<ReturnType<typeof buildDefinition>['renderInlineContent']>
    >[0];
    const renderCallbacks = {} as unknown as Parameters<
      NonNullable<ReturnType<typeof buildDefinition>['renderCanvasContent']>
    >[1];

    it('forwards searchSession into the canvas content element', () => {
      const searchSession = { clear: jest.fn() } as unknown as ISessionService;
      const def = buildDefinition({ searchSession });

      const suspenseElement = def.renderCanvasContent!(
        renderProps,
        renderCallbacks
      ) as ReactElement<{
        children: ReactElement<{ searchSession?: ISessionService }>;
      }>;

      expect(suspenseElement.props.children.props.searchSession).toBe(searchSession);
    });

    it('forwards searchSession into the inline content element', () => {
      const searchSession = { clear: jest.fn() } as unknown as ISessionService;
      const def = buildDefinition({ searchSession });

      const suspenseElement = def.renderInlineContent!(renderProps) as ReactElement<{
        children: ReactElement<{ searchSession?: ISessionService }>;
      }>;

      expect(suspenseElement.props.children.props.searchSession).toBe(searchSession);
    });
  });

  describe('getLabel', () => {
    it('returns the default label for a single-entity payload', () => {
      const def = buildDefinition();
      expect(
        def.getLabel(attachmentOf({ identifierType: 'host', identifier: 'alpha' }))
      ).toBe('Risk Entity');
    });

    it('returns a pluralised label for a multi-entity payload', () => {
      const def = buildDefinition();
      expect(
        def.getLabel(
          attachmentOf({
            entities: [
              { identifierType: 'host', identifier: 'a' },
              { identifierType: 'user', identifier: 'b' },
              { identifierType: 'service', identifier: 'c' },
            ],
          })
        )
      ).toBe('3 Risk Entities');
    });

    it('prefers an explicit attachmentLabel when provided', () => {
      const def = buildDefinition();
      expect(
        def.getLabel(
          attachmentOf({
            identifierType: 'host',
            identifier: 'alpha',
            attachmentLabel: 'Custom Label',
          })
        )
      ).toBe('Custom Label');
    });
  });
});
