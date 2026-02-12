/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/test_helper';
import { alert } from '../mock/alert';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import type { AlertSubtitleProps } from './alert_subtitle';
import { AlertSubtitle } from './alert_subtitle';

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
  const ruleTypeTitle = 'Log threshold breached';

  const renderComponent = (props: AlertSubtitleProps) => {
    return render(<AlertSubtitle {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show the rule type title', async () => {
    const alertSubtitle = renderComponent({
      alert,
      ruleTypeTitle,
    });

    expect(alertSubtitle.queryByText(ruleTypeTitle)).toBeInTheDocument();
  });

  it('should show a "View rule" link', async () => {
    const alertSubtitle = renderComponent({
      alert,
      ruleTypeTitle,
    });

    expect(alertSubtitle.queryByText('View rule')).toBeInTheDocument();
    expect(alertSubtitle.getByTestId('o11yAlertRuleLink')).toBeInTheDocument();
  });
});
