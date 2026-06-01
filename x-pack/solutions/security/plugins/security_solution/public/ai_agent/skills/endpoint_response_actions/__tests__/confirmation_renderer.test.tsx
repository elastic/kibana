/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ConfirmationCard } from '../confirmation_renderer';

const noOp = jest.fn();

const hostRef = {
  hostName: 'WIN-PROD-042',
  agentId: 'agent-abc-123',
  isIsolated: false,
};

describe('ConfirmationCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isolate action', () => {
    it('renders hostName in the description list', () => {
      const { getByText } = render(
        <ConfirmationCard hostRef={hostRef} actionType="isolate" onConfirm={noOp} onCancel={noOp} />
      );

      expect(getByText('WIN-PROD-042')).toBeInTheDocument();
    });

    it('renders agentId in the description list', () => {
      const { getByText } = render(
        <ConfirmationCard hostRef={hostRef} actionType="isolate" onConfirm={noOp} onCancel={noOp} />
      );

      expect(getByText('agent-abc-123')).toBeInTheDocument();
    });

    it('renders Isolate host as the action label', () => {
      const { getByText } = render(
        <ConfirmationCard hostRef={hostRef} actionType="isolate" onConfirm={noOp} onCancel={noOp} />
      );

      expect(getByText('Isolate host')).toBeInTheDocument();
    });

    it('renders the isolation impact statement', () => {
      const { getByText } = render(
        <ConfirmationCard hostRef={hostRef} actionType="isolate" onConfirm={noOp} onCancel={noOp} />
      );

      expect(
        getByText('Isolating will sever all network connectivity for this host.')
      ).toBeInTheDocument();
    });

    it('matches snapshot', () => {
      const { container } = render(
        <ConfirmationCard hostRef={hostRef} actionType="isolate" onConfirm={noOp} onCancel={noOp} />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('unisolate action', () => {
    it('renders hostName in the description list', () => {
      const { getByText } = render(
        <ConfirmationCard
          hostRef={{ ...hostRef, isIsolated: true }}
          actionType="unisolate"
          onConfirm={noOp}
          onCancel={noOp}
        />
      );

      expect(getByText('WIN-PROD-042')).toBeInTheDocument();
    });

    it('renders Un-isolate host as the action label', () => {
      const { getByText } = render(
        <ConfirmationCard
          hostRef={{ ...hostRef, isIsolated: true }}
          actionType="unisolate"
          onConfirm={noOp}
          onCancel={noOp}
        />
      );

      expect(getByText('Un-isolate host')).toBeInTheDocument();
    });

    it('renders the un-isolation impact statement', () => {
      const { getByText } = render(
        <ConfirmationCard
          hostRef={{ ...hostRef, isIsolated: true }}
          actionType="unisolate"
          onConfirm={noOp}
          onCancel={noOp}
        />
      );

      expect(
        getByText('Un-isolating will restore full network connectivity for this host.')
      ).toBeInTheDocument();
    });

    it('matches snapshot', () => {
      const { container } = render(
        <ConfirmationCard
          hostRef={{ ...hostRef, isIsolated: true }}
          actionType="unisolate"
          onConfirm={noOp}
          onCancel={noOp}
        />
      );

      expect(container).toMatchSnapshot();
    });
  });

  describe('button interactions', () => {
    it('calls onConfirm when Confirm button is clicked', () => {
      const onConfirm = jest.fn();
      const { getByTestId } = render(
        <ConfirmationCard
          hostRef={hostRef}
          actionType="isolate"
          onConfirm={onConfirm}
          onCancel={noOp}
        />
      );

      getByTestId('endpoint-response-action-confirm').click();
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel button is clicked', () => {
      const onCancel = jest.fn();
      const { getByTestId } = render(
        <ConfirmationCard
          hostRef={hostRef}
          actionType="isolate"
          onConfirm={noOp}
          onCancel={onCancel}
        />
      );

      getByTestId('endpoint-response-action-cancel').click();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
