/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { I18nProvider } from '@kbn/i18n-react';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry/events/flyout_v2/types';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { RiskScorePreviewTable } from './risk_score_preview_table';

vi.mock('@kbn/expandable-flyout');
vi.mock('../../../common/hooks/use_is_new_flyout_enabled');
vi.mock('../../../flyout_v2/use_flyout_api');

const mockOpenEntityFlyout = vi.fn();
const mockOpenRightPanel = vi.fn();
const TestProviders: React.FC<React.PropsWithChildren> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: TestProviders });

const riskScoreRecord: EntityRiskScoreRecord = {
  '@timestamp': '2026-07-24T12:00:00.000Z',
  id_field: 'entity.id',
  id_value: 'host:web-01',
  calculated_level: 'Low',
  calculated_score: 20,
  calculated_score_norm: 20,
  category_1_score: 20,
  category_1_count: 1,
  inputs: [],
  notes: [],
};

describe('RiskScorePreviewTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useIsNewFlyoutEnabled as Mock).mockReturnValue(true);
    (useFlyoutApi as Mock).mockReturnValue({
      openEntityFlyout: mockOpenEntityFlyout,
    });
    (useExpandableFlyoutApi as Mock).mockReturnValue({
      openRightPanel: mockOpenRightPanel,
    });
  });

  it('attributes v2 entity flyouts to the risk score preview', () => {
    render(<RiskScorePreviewTable items={[riskScoreRecord]} type={EntityType.host} />);

    fireEvent.click(screen.getByText('host:web-01'));

    expect(mockOpenEntityFlyout).toHaveBeenCalledWith({
      engineType: EntityType.host,
      entityId: 'host:web-01',
      entityName: 'host:web-01',
      contextID: 'risk-score-preview',
      scopeId: 'risk-score-preview',
      origin: FLYOUT_ORIGIN.RISK_SCORE_PREVIEW,
    });
    expect(mockOpenRightPanel).not.toHaveBeenCalled();
  });
});
