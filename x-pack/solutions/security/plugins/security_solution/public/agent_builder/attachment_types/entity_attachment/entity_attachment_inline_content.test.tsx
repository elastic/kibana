/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { EntityAttachment } from './types';
import {
  ENTITY_ATTACHMENT_ROOT_CLASS,
  EntityAttachmentInlineContent,
} from './entity_attachment_inline_content';

jest.mock('./entity_card/entity_card', () => ({
  EntityCard: (props: Record<string, unknown>) => (
    <div
      data-test-subj="entityCardMock"
      data-watchlists-enabled={String(props.watchlistsEnabled)}
      data-privmon-modifier-enabled={String(props.privmonModifierEnabled)}
    >
      {JSON.stringify(props.identifier)}
    </div>
  ),
}));

jest.mock('./entity_table/entity_table', () => ({
  EntityTable: (props: Record<string, unknown>) => (
    <div data-test-subj="entityTableMock">{`count:${(props.entities as unknown[]).length}`}</div>
  ),
}));

const experimentalFeatures = {
  entityAnalyticsWatchlistEnabled: true,
  enableRiskScorePrivmonModifier: true,
} as unknown as ExperimentalFeatures;

const attachment = (data: unknown): EntityAttachment =>
  ({
    id: 'a',
    type: 'security.entity',
    data: data as EntityAttachment['data'],
  } as EntityAttachment);

const renderDispatcher = (data: unknown) =>
  render(
    <I18nProvider>
      <EntityAttachmentInlineContent
        attachment={attachment(data)}
        isSidebar={false}
        experimentalFeatures={experimentalFeatures}
      />
    </I18nProvider>
  );

describe('EntityAttachmentInlineContent', () => {
  it('renders the card for a legacy single-identifier payload', () => {
    renderDispatcher({ identifierType: 'host', identifier: 'alpha' });
    expect(screen.getByTestId('entityCardMock')).toBeInTheDocument();
    expect(screen.queryByTestId('entityTableMock')).not.toBeInTheDocument();
    expect(screen.getByTestId('entityCardMock').textContent).toContain('alpha');
  });

  it('renders the card for a single-element entities list', () => {
    renderDispatcher({ entities: [{ identifierType: 'user', identifier: 'bob' }] });
    expect(screen.getByTestId('entityCardMock')).toBeInTheDocument();
    expect(screen.queryByTestId('entityTableMock')).not.toBeInTheDocument();
  });

  it('renders the table for a multi-entity payload', () => {
    renderDispatcher({
      entities: [
        { identifierType: 'host', identifier: 'alpha' },
        { identifierType: 'user', identifier: 'bob' },
      ],
    });
    expect(screen.getByTestId('entityTableMock')).toBeInTheDocument();
    expect(screen.queryByTestId('entityCardMock')).not.toBeInTheDocument();
    expect(screen.getByTestId('entityTableMock').textContent).toContain('count:2');
  });

  it('renders the graceful empty callout for unusable payloads', () => {
    renderDispatcher({ foo: 'bar' });
    expect(screen.getByTestId('entityAttachmentEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('entityCardMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityTableMock')).not.toBeInTheDocument();
  });

  it('forwards watchlist and privmon modifier flags to the EntityCard', () => {
    renderDispatcher({ identifierType: 'host', identifier: 'alpha' });
    const card = screen.getByTestId('entityCardMock');
    expect(card.getAttribute('data-watchlists-enabled')).toBe('true');
    expect(card.getAttribute('data-privmon-modifier-enabled')).toBe('true');
  });

  it('forwards entityStoreId from a single-entity payload to the EntityCard identifier', () => {
    renderDispatcher({
      identifierType: 'user',
      identifier: "Lena Medhurst@Lena's MacBook Pro",
      entityStoreId: "user:Lena Medhurst@Lena's MacBook Pro@local",
    });
    const card = screen.getByTestId('entityCardMock');
    const serialized = JSON.parse(card.textContent ?? '{}');
    expect(serialized).toEqual({
      identifierType: 'user',
      identifier: "Lena Medhurst@Lena's MacBook Pro",
      entityStoreId: "user:Lena Medhurst@Lena's MacBook Pro@local",
    });
  });

  it('forwards entityStoreId from a single-element entities list to the EntityCard identifier', () => {
    renderDispatcher({
      entities: [
        {
          identifierType: 'user',
          identifier: 'bob',
          entityStoreId: 'user:bob@workstation@local',
        },
      ],
    });
    const card = screen.getByTestId('entityCardMock');
    const serialized = JSON.parse(card.textContent ?? '{}');
    expect(serialized.entityStoreId).toBe('user:bob@workstation@local');
  });

  describe('outer-panel spacing workaround', () => {
    it('wraps valid payloads in a div with the ENTITY_ATTACHMENT_ROOT_CLASS marker', () => {
      const { container } = renderDispatcher({ identifierType: 'host', identifier: 'alpha' });
      const marker = container.querySelector(`.${ENTITY_ATTACHMENT_ROOT_CLASS}`);
      expect(marker).not.toBeNull();
      expect(marker).toContainElement(screen.getByTestId('entityCardMock'));
    });

    it('wraps the empty callout in a div with the ENTITY_ATTACHMENT_ROOT_CLASS marker', () => {
      const { container } = renderDispatcher({ foo: 'bar' });
      const marker = container.querySelector(`.${ENTITY_ATTACHMENT_ROOT_CLASS}`);
      expect(marker).not.toBeNull();
      expect(marker).toContainElement(screen.getByTestId('entityAttachmentEmpty'));
    });

    it('mounts a global style that scopes the margin to .euiSplitPanel ancestors of the marker', () => {
      renderDispatcher({ identifierType: 'host', identifier: 'alpha' });
      // Emotion's <Global> injects rules into `document.styleSheets` via
      // `CSSStyleSheet.insertRule` in jsdom, so the <style> tag's textContent
      // is empty. Read the serialized rules from every stylesheet instead.
      const cssText = Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .map((rule) => rule.cssText)
        .join('\n');
      expect(cssText).toContain(ENTITY_ATTACHMENT_ROOT_CLASS);
      expect(cssText).toMatch(/\.euiSplitPanel:has\(/);
      expect(cssText).toContain('margin-block-end');
    });
  });
});
