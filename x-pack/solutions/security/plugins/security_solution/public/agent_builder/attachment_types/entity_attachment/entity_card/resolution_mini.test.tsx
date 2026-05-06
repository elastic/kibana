/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useResolutionGroup } from '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group';
import { ResolutionMini } from './resolution_mini';

jest.mock(
  '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group',
  () => ({
    useResolutionGroup: jest.fn(),
  })
);

jest.mock(
  '../../../../entity_analytics/components/entity_resolution/resolution_group_table',
  () => ({
    ResolutionGroupTable: (props: Record<string, unknown>) => (
      <div
        data-test-subj="resolutionGroupTableMock"
        data-target-id={String(props.targetEntityId ?? '')}
        data-show-actions={String(props.showActions)}
        data-current-id={String(props.currentEntityId ?? '')}
      />
    ),
  })
);

const mockedUseResolutionGroup = useResolutionGroup as jest.Mock;

const renderMini = (props: Partial<React.ComponentProps<typeof ResolutionMini>> = {}) =>
  render(
    <I18nProvider>
      <ResolutionMini
        entityStoreEntityId="entity-1"
        currentEntityStoreEntityId="entity-1"
        {...props}
      />
    </I18nProvider>
  );

describe('ResolutionMini', () => {
  beforeEach(() => {
    mockedUseResolutionGroup.mockReset();
  });

  it('returns null when there is no entity id to query for', () => {
    mockedUseResolutionGroup.mockReturnValue({ data: undefined, isLoading: false });
    const { container } = renderMini({ entityStoreEntityId: undefined });
    expect(container.firstChild).toBeNull();
  });

  it('returns null when the resolution group is empty (group_size <= 1)', () => {
    mockedUseResolutionGroup.mockReturnValue({
      data: { target: {}, aliases: [], group_size: 1 },
      isLoading: false,
    });
    const { container } = renderMini();
    expect(container.firstChild).toBeNull();
  });

  it('renders the accordion with the reused table when the group has aliases', () => {
    mockedUseResolutionGroup.mockReturnValue({
      data: {
        target: { entity: { id: 'target-id' } },
        aliases: [{ entity: { id: 'alias-id' } }],
        group_size: 2,
      },
      isLoading: false,
    });
    renderMini();
    expect(screen.getByTestId('entityAttachmentResolutionMini')).toBeInTheDocument();
    const table = screen.getByTestId('resolutionGroupTableMock');
    expect(table.getAttribute('data-target-id')).toBe('target-id');
    expect(table.getAttribute('data-show-actions')).toBe('false');
    expect(table.getAttribute('data-current-id')).toBe('entity-1');
  });
});
