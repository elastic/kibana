/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import type { EntityAttachment } from './types';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { EntityAttachmentCanvasContent } from './entity_attachment_canvas_content';

/**
 * Canvas-content dispatcher tests.
 *
 * The component is a thin dispatcher that branches on the `normaliseEntityAttachment` output:
 *   - invalid / multi-entity payload → empty `EuiPanel` (no card, no flyout)
 *   - single non-flyout-capable entity (e.g. `generic`) → `EntityCard` fallback
 *   - single host/user/service → `SecurityReduxEmbeddedProvider` wrapping
 *     `EntityCardFlyoutOverviewCanvas`
 *
 * The heavy downstream components (`SecurityReduxEmbeddedProvider`,
 * `EntityCardFlyoutOverviewCanvas`, `EntityCard`) each have their own test suites; mocking them
 * here lets us focus on the dispatch-level branches without reproducing the Security Redux /
 * sourcerer runtime.
 */

jest.mock('../../components/security_redux_embedded_provider', () => ({
  SecurityReduxEmbeddedProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="securityReduxEmbeddedProviderMock">{children}</div>
  ),
}));

jest.mock('../../components/entity_card_flyout_overview_canvas', () => ({
  EntityCardFlyoutOverviewCanvas: (props: Record<string, unknown>) => (
    <div data-test-subj="entityCardFlyoutOverviewCanvasMock">
      {JSON.stringify(props.identifier)}
    </div>
  ),
}));

jest.mock('./entity_card/entity_card', () => ({
  EntityCard: (props: Record<string, unknown>) => (
    <div data-test-subj="entityCardMock">{JSON.stringify(props.identifier)}</div>
  ),
}));

const experimentalFeatures = {
  entityAnalyticsWatchlistEnabled: false,
  enableRiskScorePrivmonModifier: false,
} as unknown as ExperimentalFeatures;

const applicationStub = { navigateToApp: jest.fn() } as unknown as ApplicationStart;
const resolveSecurityCanvasContext = jest.fn(
  async () => ({} as unknown as SecurityCanvasEmbeddedBundle)
);

const attachmentOf = (data: unknown): EntityAttachment =>
  ({ id: 'a', type: 'security.entity', data } as unknown as EntityAttachment);

const renderCanvas = (data: unknown) =>
  render(
    <I18nProvider>
      <EntityAttachmentCanvasContent
        attachment={attachmentOf(data)}
        isSidebar={false}
        experimentalFeatures={experimentalFeatures}
        application={applicationStub}
        resolveSecurityCanvasContext={resolveSecurityCanvasContext}
      />
    </I18nProvider>
  );

describe('EntityAttachmentCanvasContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flyout canvas inside SecurityReduxEmbeddedProvider for a single host entity', () => {
    renderCanvas({ identifierType: 'host', identifier: 'host-1' });
    expect(screen.getByTestId('securityReduxEmbeddedProviderMock')).toBeInTheDocument();
    expect(screen.getByTestId('entityCardFlyoutOverviewCanvasMock')).toBeInTheDocument();
    expect(screen.getByTestId('entityCardFlyoutOverviewCanvasMock').textContent).toContain(
      'host-1'
    );
    expect(screen.queryByTestId('entityCardMock')).not.toBeInTheDocument();
  });

  it('renders the flyout canvas inside SecurityReduxEmbeddedProvider for single user / service entities', () => {
    for (const identifierType of ['user', 'service'] as const) {
      const { unmount } = renderCanvas({ identifierType, identifier: 'x' });
      expect(screen.getByTestId('securityReduxEmbeddedProviderMock')).toBeInTheDocument();
      expect(screen.getByTestId('entityCardFlyoutOverviewCanvasMock')).toBeInTheDocument();
      unmount();
    }
  });

  it('falls back to the EntityCard (no flyout provider) for a single generic entity', () => {
    renderCanvas({ identifierType: 'generic', identifier: 'some-resource' });
    expect(screen.getByTestId('entityCardMock')).toBeInTheDocument();
    expect(screen.queryByTestId('securityReduxEmbeddedProviderMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityCardFlyoutOverviewCanvasMock')).not.toBeInTheDocument();
  });

  it('does not render a card or flyout for a multi-entity payload', () => {
    renderCanvas({
      entities: [
        { identifierType: 'host', identifier: 'a' },
        { identifierType: 'user', identifier: 'b' },
      ],
    });
    expect(screen.queryByTestId('securityReduxEmbeddedProviderMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityCardFlyoutOverviewCanvasMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityCardMock')).not.toBeInTheDocument();
  });

  it('does not render a card or flyout for an invalid payload', () => {
    renderCanvas({ foo: 'bar' });
    expect(screen.queryByTestId('securityReduxEmbeddedProviderMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityCardFlyoutOverviewCanvasMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('entityCardMock')).not.toBeInTheDocument();
  });
});
