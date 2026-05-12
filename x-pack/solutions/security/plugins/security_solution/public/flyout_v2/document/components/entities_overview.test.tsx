/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';
import { EntitiesOverview } from './entities_overview';
import { TestProviders } from '../../../common/mock';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
  EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID,
} from '../../shared/components/test_ids';
import { useEntitiesOverview } from '../hooks/use_entities_overview';

jest.mock('../hooks/use_entities_overview');
jest.mock('./user_entity_overview', () => ({
  UserEntityOverview: ({ userName }: { userName: string }) => (
    <div data-test-subj="userEntityOverviewMock">{userName}</div>
  ),
}));
jest.mock('./host_entity_overview', () => ({
  HostEntityOverview: ({ hostName }: { hostName: string }) => (
    <div data-test-subj="hostEntityOverviewMock">{hostName}</div>
  ),
}));

const mockUseEntitiesOverview = useEntitiesOverview as jest.Mock;

const TOGGLE_ICON_TEST_ID = EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_LINK_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_ICON_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);
const TITLE_TEXT_TEST_ID = EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(INSIGHTS_ENTITIES_TEST_ID);

const buildHit = (source: Record<string, unknown>): DataTableRecord =>
  buildDataTableRecord({ _id: 'id-1', _index: 'idx-1', _source: source });

const renderEntitiesOverview = (props: {
  hit: DataTableRecord;
  onShowEntitiesDetails?: () => void;
  showIcon?: boolean;
}) =>
  render(
    <TestProviders>
      <EntitiesOverview {...props} />
    </TestProviders>
  );

const NO_DATA_MESSAGE = 'Host and user information are unavailable for this alert.';

describe('<EntitiesOverview />', () => {
  beforeEach(() => {
    mockUseEntitiesOverview.mockReturnValue({
      user: { name: 'user1', identityFields: { 'user.name': 'user1' }, entityRecord: undefined },
      host: {
        name: 'host-name',
        identityFields: { 'host.name': 'host-name' },
        entityRecord: undefined,
      },
      hasAnyEntity: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render wrapper component with link when onShowEntitiesDetails is provided', () => {
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });
    const { getByTestId, queryByTestId } = renderEntitiesOverview({
      hit,
      onShowEntitiesDetails: jest.fn(),
    });

    expect(queryByTestId(TOGGLE_ICON_TEST_ID)).toBeNull();
    expect(getByTestId(TITLE_LINK_TEST_ID)).not.toBeNull();
    expect(getByTestId(TITLE_LINK_TEST_ID).textContent).toContain('Entities');
    expect(getByTestId(TITLE_ICON_TEST_ID)).not.toBeNull();
    expect(queryByTestId(TITLE_TEXT_TEST_ID)).toBeNull();
  });

  it('should hide the link when onShowEntitiesDetails is not provided', () => {
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });
    const { getByTestId, queryByTestId } = renderEntitiesOverview({ hit });

    expect(queryByTestId(TITLE_LINK_TEST_ID)).toBeNull();
    expect(getByTestId(TITLE_TEXT_TEST_ID)).not.toBeNull();
    expect(getByTestId(TITLE_TEXT_TEST_ID).textContent).toContain('Entities');
  });

  it('should hide the icon when showIcon is false', () => {
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });
    const { queryByTestId } = renderEntitiesOverview({
      hit,
      showIcon: false,
      onShowEntitiesDetails: jest.fn(),
    });
    expect(queryByTestId(TITLE_ICON_TEST_ID)).toBeNull();
  });

  it('should render user and host', () => {
    const hit = buildHit({ host: { name: 'host-name' }, user: { name: 'user1' } });

    const { getByTestId, queryByText } = renderEntitiesOverview({ hit });
    expect(getByTestId('userEntityOverviewMock').textContent).toContain('user1');
    expect(getByTestId('hostEntityOverviewMock').textContent).toContain('host-name');
    expect(queryByText(NO_DATA_MESSAGE)).toBeNull();
  });

  it('should only render user when host name is null', () => {
    mockUseEntitiesOverview.mockReturnValue({
      user: { name: 'user1', identityFields: { 'user.name': 'user1' }, entityRecord: undefined },
      host: undefined,
      hasAnyEntity: true,
    });
    const hit = buildHit({ user: { name: 'user1' } });

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview({ hit });

    expect(getByTestId('userEntityOverviewMock')).not.toBeNull();
    expect(queryByTestId('hostEntityOverviewMock')).toBeNull();
    expect(queryByText(NO_DATA_MESSAGE)).toBeNull();
  });

  it('should only render host when user name is null', () => {
    mockUseEntitiesOverview.mockReturnValue({
      user: undefined,
      host: {
        name: 'host-name',
        identityFields: { 'host.name': 'host-name' },
        entityRecord: undefined,
      },
      hasAnyEntity: true,
    });
    const hit = buildHit({ host: { name: 'host-name' } });

    const { queryByTestId, getByTestId, queryByText } = renderEntitiesOverview({ hit });

    expect(getByTestId('hostEntityOverviewMock')).not.toBeNull();
    expect(queryByTestId('userEntityOverviewMock')).toBeNull();
    expect(queryByText(NO_DATA_MESSAGE)).toBeNull();
  });

  it('should render no data message if no entities are available', () => {
    mockUseEntitiesOverview.mockReturnValue({
      user: undefined,
      host: undefined,
      hasAnyEntity: false,
    });
    const hit = buildHit({});

    const { getByText } = renderEntitiesOverview({ hit });
    expect(getByText(NO_DATA_MESSAGE)).not.toBeNull();
  });

  it('should pass document data to the entities overview hook', () => {
    const hit = buildHit({ host: { name: 'host-name' } });

    renderEntitiesOverview({ hit });

    expect(mockUseEntitiesOverview).toHaveBeenCalledWith({ hit });
  });
});
