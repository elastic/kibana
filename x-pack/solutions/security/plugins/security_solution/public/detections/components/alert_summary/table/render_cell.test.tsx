/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { CellValue } from './render_cell';
import { TestProviders } from '../../../../common/mock';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { ALERT_SEVERITY, TIMESTAMP } from '@kbn/rule-data-utils';
import { BADGE_TEST_ID } from './kibana_alert_severity_cell_renderer';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import { TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID } from './kibana_alert_related_integrations_cell_renderer';
import { INTEGRATION_ICON_TEST_ID } from '../common/integration_icon';
import type { RuleResponse } from '../../../../../common/api/detection_engine';

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '0.1.0',
  },
];
const ruleResponse = {
  rules: [
    {
      name: 'splunk',
      related_integrations: [
        {
          package: 'splunk',
        },
      ],
      rule_id: 'rule_rule_id',
    } as RuleResponse,
  ],
  isLoading: false,
};

describe('CellValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle missing field', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const columnId = 'columnId';
    const schema = 'unknown';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText(getEmptyValue())).toBeInTheDocument();
  });

  it('should handle string value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const columnId = 'field1';
    const schema = 'string';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText('value1')).toBeInTheDocument();
  });

  it('should handle a number value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 123,
    };
    const columnId = 'field1';
    const schema = 'unknown';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText('123')).toBeInTheDocument();
  });

  it('should handle array of booleans', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [true, false],
    };
    const columnId = 'field1';
    const schema = 'unknown';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText('true, false')).toBeInTheDocument();
  });

  it('should handle array of numbers', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [1, 2],
    };
    const columnId = 'field1';
    const schema = 'unknown';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText('1, 2')).toBeInTheDocument();
  });

  it('should handle array of null', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [null, null],
    };
    const columnId = 'field1';
    const schema = 'unknown';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText(',')).toBeInTheDocument();
  });

  it('should join array of JsonObjects', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [{ subField1: 'value1', subField2: 'value2' }],
    };
    const columnId = 'field1';
    const schema = 'unknown';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText('[object Object]')).toBeInTheDocument();
  });

  it('should use related integration renderer', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      'signal.rule.rule_id': 'rule_rule_id',
    };
    const columnId = 'signal.rule.rule_id';
    const schema = 'unknown';

    const { getByTestId } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(
      getByTestId(`${TABLE_RELATED_INTEGRATION_CELL_RENDERER_TEST_ID}-${INTEGRATION_ICON_TEST_ID}`)
    ).toBeInTheDocument();
  });

  it('should use severity renderer', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [ALERT_SEVERITY]: ['low'],
    };
    const columnId = ALERT_SEVERITY;
    const schema = 'unknown';

    const { getByTestId } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByTestId(BADGE_TEST_ID)).toBeInTheDocument();
  });

  it('should use datetime renderer', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      [TIMESTAMP]: [1735754400000],
    };
    const columnId = TIMESTAMP;
    const schema = 'datetime';

    const { getByText } = render(
      <TestProviders>
        <CellValue
          alert={alert}
          columnId={columnId}
          packages={packages}
          ruleResponse={ruleResponse}
          schema={schema}
        />
      </TestProviders>
    );

    expect(getByText('Jan 1, 2025 @ 18:00:00.000')).toBeInTheDocument();
  });
});
