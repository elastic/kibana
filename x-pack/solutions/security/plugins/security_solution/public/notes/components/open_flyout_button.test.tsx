/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../common/mock';
import { OPEN_FLYOUT_BUTTON_TEST_ID } from './test_ids';
import { OpenFlyoutButtonIcon } from './open_flyout_button';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { withIndices } from '../../data_view_manager/hooks/__mocks__/use_data_view';
import { useFlyoutApi } from '../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../flyout_v2/use_flyout_api.mock';
import { FLYOUT_ORIGIN } from '../../common/lib/telemetry';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { fetchIsAttack } from '../api/fetch_is_attack';

jest.mock('../../flyout_v2/use_flyout_api');
jest.mock('../../common/hooks/use_space_id');
jest.mock('../api/fetch_is_attack', () => ({
  ...jest.requireActual('../api/fetch_is_attack'),
  fetchIsAttack: jest.fn(),
}));

const mockEventId = 'eventId';
const mockTimelineId = 'timelineId';
const mockAttackIndexPattern =
  '.alerts-security.attack.discovery.alerts-default,.adhoc.alerts-security.attack.discovery.alerts-default';

const renderButton = () =>
  render(
    <TestProviders>
      <OpenFlyoutButtonIcon
        eventId={mockEventId}
        timelineId={mockTimelineId}
        iconType="chevronSingleRight"
      />
    </TestProviders>
  );

describe('OpenFlyoutButtonIcon', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useDataView).mockReturnValue(withIndices(['test1', 'test2']));
    jest.mocked(useSpaceId).mockReturnValue('default');
    jest.mocked(fetchIsAttack).mockResolvedValue(false);
  });

  it('should render the chevron icon', () => {
    const { getByTestId } = renderButton();

    expect(getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should open the new document flyout (from pattern)', async () => {
    const { getByTestId } = renderButton();

    fireEvent.click(getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID));

    await waitFor(() =>
      expect(flyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalledWith({
        documentId: mockEventId,
        indexName: 'test1,test2',
        origin: FLYOUT_ORIGIN.NOTE_PREVIEW,
      })
    );
    expect(fetchIsAttack).toHaveBeenCalledWith({ eventId: mockEventId, spaceId: 'default' });
  });

  it('should open the new attack flyout when the document is an attack', async () => {
    jest.mocked(fetchIsAttack).mockResolvedValue(true);

    const { getByTestId } = renderButton();

    fireEvent.click(getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID));

    await waitFor(() =>
      expect(flyoutApi.openAttackFlyout).toHaveBeenCalledWith({
        attackId: mockEventId,
        indexName: mockAttackIndexPattern,
        origin: FLYOUT_ORIGIN.NOTE_PREVIEW,
      })
    );
    expect(flyoutApi.openDocumentFlyoutFromPattern).not.toHaveBeenCalled();
  });

  it('should fall back to the document flyout when the attack lookup fails', async () => {
    jest.mocked(fetchIsAttack).mockRejectedValue(new Error('boom'));

    const { getByTestId } = renderButton();

    fireEvent.click(getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID));

    await waitFor(() => expect(flyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalled());
    expect(flyoutApi.openAttackFlyout).not.toHaveBeenCalled();
  });

  it('should skip the attack lookup while the space id is not resolved', async () => {
    jest.mocked(useSpaceId).mockReturnValue(undefined);

    const { getByTestId } = renderButton();

    fireEvent.click(getByTestId(OPEN_FLYOUT_BUTTON_TEST_ID));

    await waitFor(() => expect(flyoutApi.openDocumentFlyoutFromPattern).toHaveBeenCalled());
    expect(fetchIsAttack).not.toHaveBeenCalled();
  });
});
