/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AssistantRowControlColumn } from './assistant_row_control_column';
import type { Alert } from '@kbn/alerting-types';
import { useAssistant } from '../../../hooks/alert_summary/use_assistant';

jest.mock('../../../hooks/alert_summary/use_assistant');

describe('AssistantRowControlColumn', () => {
  it('should render the icon button', () => {
    (useAssistant as jest.Mock).mockReturnValue({
      showAssistantOverlay: jest.fn(),
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };

    const { getByTestId } = render(<AssistantRowControlColumn alert={alert} />);

    expect(getByTestId('newChatByTitle')).toBeInTheDocument();
    expect(getByTestId('newChatByTitleIcon')).toBeInTheDocument();
  });

  it('should call the callback when clicked', () => {
    const showAssistantOverlay = jest.fn();
    (useAssistant as jest.Mock).mockReturnValue({
      showAssistantOverlay,
    });

    const alert: Alert = {
      _id: '_id',
      _index: '_index',
    };

    const { getByTestId } = render(<AssistantRowControlColumn alert={alert} />);

    const button = getByTestId('newChatByTitle');
    expect(button).toBeInTheDocument();

    button.click();

    expect(showAssistantOverlay).toHaveBeenCalled();
  });
});
