/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { render } from '../../../utils/test_helper';
import { alert } from '../mock/alert';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { AlertSubtitle, AlertSubtitleProps } from './alert_subtitle';

jest.mock('../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
};

describe('Alert subtitle', () => {
  const renderComponent = (props: AlertSubtitleProps) => {
    return render(<AlertSubtitle {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show alert subtitle', async () => {
    const alertSubtitle = renderComponent({
      alert,
    });

    expect(alertSubtitle.queryByText('Rule:')).toBeInTheDocument();

    expect(alertSubtitle.queryByText(alert.fields[ALERT_RULE_NAME])).toBeInTheDocument();
  });
});
