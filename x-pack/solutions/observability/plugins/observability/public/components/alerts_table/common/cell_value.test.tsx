/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { render } from '../../../utils/test_helper';
import { AlertsTableCellValue } from './cell_value';
import { Alert } from '@kbn/alerting-types';

interface AlertsTableRow {
  alertStatus: typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED;
}

describe('AlertsTableCellValue', () => {
  describe('when column is alert status', () => {
    it('should return an active indicator when alert status is active', async () => {
      const cell = render(
        <AlertsTableCellValue
          {...requiredProperties}
          columnId={ALERT_STATUS}
          alert={makeAlertsTableRow({ alertStatus: ALERT_STATUS_ACTIVE })}
        />
      );

      expect(cell.getByText('Active')).toBeInTheDocument();
    });

    it('should return a recovered indicator when alert status is recovered', async () => {
      const cell = render(
        <AlertsTableCellValue
          {...requiredProperties}
          columnId={ALERT_STATUS}
          alert={makeAlertsTableRow({ alertStatus: ALERT_STATUS_RECOVERED })}
        />
      );

      expect(cell.getByText('Recovered')).toBeInTheDocument();
    });
  });
});

function makeAlertsTableRow({ alertStatus }: AlertsTableRow) {
  return {
    [ALERT_STATUS]: [alertStatus],
  } as unknown as Alert;
}

const requiredProperties = {
  rowIndex: 0,
  colIndex: 0,
  columnId: '',
  setCellProps: jest.fn(),
  isExpandable: false,
  isExpanded: false,
  isDetails: false,
  data: [],
  eventId: '',
  header: {
    id: '',
    columnHeaderType: 'not-filtered',
  },
  isDraggable: false,
  linkValues: [],
  scopeId: '',
} as unknown as ComponentProps<typeof AlertsTableCellValue>;
