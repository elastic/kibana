/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../common/mock';
import React from 'react';
import { SessionPreviewContainer } from './session_preview_container';
import { useSessionViewConfig } from '../hooks/use_session_view_config';
import { useLicense } from '../../../common/hooks/use_license';
import { SESSION_PREVIEW_TEST_ID } from './test_ids';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
} from '../../shared/components/test_ids';

jest.mock('../hooks/use_session_view_config');
jest.mock('../../../common/hooks/use_license');

const sessionViewConfig = {
  index: {},
  sessionEntityId: 'sessionEntityId',
  sessionStartTime: 'sessionStartTime',
};

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const hit = createMockHit({
  'event.kind': 'signal',
});

const onShowSessionView = jest.fn();

const renderSessionPreview = ({
  disableNavigation = false,
  showIcon = true,
}: {
  disableNavigation?: boolean;
  showIcon?: boolean;
} = {}) =>
  render(
    <TestProviders>
      <SessionPreviewContainer
        hit={hit}
        disableNavigation={disableNavigation}
        showIcon={showIcon}
        onShowSessionView={onShowSessionView}
      />
    </TestProviders>
  );

describe('SessionPreviewContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionViewConfig as jest.Mock).mockReturnValue(sessionViewConfig);
    (useLicense as jest.Mock).mockReturnValue({ isEnterprise: () => true });
  });

  it('should call onShowSessionView when navigation link is clicked', () => {
    const { getByTestId } = renderSessionPreview();

    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID)).click();

    expect(onShowSessionView).toHaveBeenCalled();
  });

  it('should not render link to session viewer when navigation is disabled', () => {
    const { getByTestId, queryByTestId } = renderSessionPreview({ disableNavigation: true });

    expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();
    expect(
      queryByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).not.toBeInTheDocument();
  });

  it('should render link to session viewer when icon is hidden', () => {
    const { getByTestId } = renderSessionPreview({ showIcon: false });

    expect(getByTestId(SESSION_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(
      getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID))
    ).toBeInTheDocument();

    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(SESSION_PREVIEW_TEST_ID)).click();
    expect(onShowSessionView).toHaveBeenCalled();
  });
});
