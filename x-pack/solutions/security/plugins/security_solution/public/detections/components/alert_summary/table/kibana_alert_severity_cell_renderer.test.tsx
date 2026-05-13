/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { TestProviders } from '../../../../common/mock';
import {
  BADGE_TEST_ID,
  KibanaAlertSeverityCellRenderer,
} from './kibana_alert_severity_cell_renderer';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';

describe('KibanaAlertSeverityCellRenderer', () => {
  it('should handle missing field', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };

    const { container } = render(
      <TestProviders>
        <KibanaAlertSeverityCellRenderer alert={alert} />
      </TestProviders>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should show low', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_SEVERITY]: ['low'],
    };

    const { getByTestId } = render(
      <TestProviders>
        <KibanaAlertSeverityCellRenderer alert={alert} />
      </TestProviders>
    );

    expect(getByTestId(BADGE_TEST_ID)).toHaveTextContent('Low');
    expect(getByTestId(BADGE_TEST_ID)).toHaveStyle('--euiBadgeBackgroundColor: #54B399');
  });

  it('should show medium', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_SEVERITY]: ['medium'],
    };

    const { getByTestId } = render(
      <TestProviders>
        <KibanaAlertSeverityCellRenderer alert={alert} />
      </TestProviders>
    );

    expect(getByTestId(BADGE_TEST_ID)).toHaveTextContent('Medium');
    expect(getByTestId(BADGE_TEST_ID)).toHaveStyle('--euiBadgeBackgroundColor: #D6BF57');
  });

  it('should show high', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_SEVERITY]: ['high'],
    };

    const { getByTestId } = render(
      <TestProviders>
        <KibanaAlertSeverityCellRenderer alert={alert} />
      </TestProviders>
    );

    expect(getByTestId(BADGE_TEST_ID)).toHaveTextContent('High');
    expect(getByTestId(BADGE_TEST_ID)).toHaveStyle('--euiBadgeBackgroundColor: #DA8B45');
  });

  it('should show critical', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_SEVERITY]: ['critical'],
    };

    const { getByTestId } = render(
      <TestProviders>
        <KibanaAlertSeverityCellRenderer alert={alert} />
      </TestProviders>
    );

    expect(getByTestId(BADGE_TEST_ID)).toHaveTextContent('Critical');
    expect(getByTestId(BADGE_TEST_ID)).toHaveStyle('--euiBadgeBackgroundColor: #E7664C');
  });
});
