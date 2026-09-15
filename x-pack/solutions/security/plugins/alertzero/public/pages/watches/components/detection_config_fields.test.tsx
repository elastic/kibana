/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  type DetectionConfig,
  type WatchAutonomyLevel,
} from '@kbn/alertzero-common';
import { DetectionConfigFields } from './detection_config_fields';

const TRIAGE = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;
const TUNING = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;

const renderFields = ({
  workerId = TRIAGE as string,
  current = { confidenceThreshold: 0.85, fpCountThreshold: 10 } as DetectionConfig,
  autonomy = 'manual' as WatchAutonomyLevel,
  onChange = jest.fn(),
  isDisabled = false,
} = {}) => {
  const { rerender } = render(
    <DetectionConfigFields
      workerId={workerId}
      current={current}
      autonomy={autonomy}
      isDisabled={isDisabled}
      onChange={onChange}
    />
  );
  return {
    onChange,
    rerender,
    confidenceValue: () =>
      screen.getByTestId('alertZeroConfidenceThresholdValue') as HTMLInputElement,
    fpCountValue: () => screen.getByTestId('alertZeroFpCountThresholdValue') as HTMLInputElement,
  };
};

describe('DetectionConfigFields', () => {
  it('renders the funnel only for Alert Triage', () => {
    renderFields({ workerId: TRIAGE });
    expect(screen.getByTestId('alertZeroConsequenceFunnel')).toBeInTheDocument();
  });

  it('does not render the funnel for a Worker without alert-triage copy', () => {
    renderFields({ workerId: TUNING });
    expect(screen.queryByTestId('alertZeroConsequenceFunnel')).not.toBeInTheDocument();
  });

  describe('confidenceThreshold', () => {
    it('persists a valid in-range value on blur', () => {
      const { onChange, confidenceValue } = renderFields();

      fireEvent.change(confidenceValue(), { target: { value: '0.7' } });
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.blur(confidenceValue());

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ confidenceThreshold: 0.7 });
    });

    it('rejects a value above 1 inline and does not persist', () => {
      const { onChange, confidenceValue } = renderFields();

      fireEvent.change(confidenceValue(), { target: { value: '1.5' } });
      fireEvent.blur(confidenceValue());

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('alertZeroConfidenceThresholdField')).toHaveTextContent(
        'Must be between 0 and 1.'
      );
    });

    it('rejects a value below 0 inline and does not persist', () => {
      const { onChange, confidenceValue } = renderFields();

      fireEvent.change(confidenceValue(), { target: { value: '-0.1' } });
      fireEvent.blur(confidenceValue());

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('alertZeroConfidenceThresholdField')).toHaveTextContent(
        'Must be between 0 and 1.'
      );
    });

    it('accepts the boundary values 0 and 1', () => {
      const { onChange, confidenceValue } = renderFields();

      fireEvent.change(confidenceValue(), { target: { value: '0' } });
      fireEvent.blur(confidenceValue());
      expect(onChange).toHaveBeenLastCalledWith({ confidenceThreshold: 0 });

      fireEvent.change(confidenceValue(), { target: { value: '1' } });
      fireEvent.blur(confidenceValue());
      expect(onChange).toHaveBeenLastCalledWith({ confidenceThreshold: 1 });
    });

    it('does not persist when blurred on the unchanged value', () => {
      const { onChange, confidenceValue } = renderFields();

      fireEvent.blur(confidenceValue());

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('fpCountThreshold', () => {
    it('persists a valid positive integer on blur', () => {
      const { onChange, fpCountValue } = renderFields();

      fireEvent.change(fpCountValue(), { target: { value: '25' } });
      fireEvent.blur(fpCountValue());

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ fpCountThreshold: 25 });
    });

    it('rejects zero inline and does not persist', () => {
      const { onChange, fpCountValue } = renderFields();

      fireEvent.change(fpCountValue(), { target: { value: '0' } });
      fireEvent.blur(fpCountValue());

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('alertZeroFpCountThresholdField')).toHaveTextContent(
        'Must be a whole number of at least 1.'
      );
    });

    it('rejects a non-integer inline and does not persist', () => {
      const { onChange, fpCountValue } = renderFields();

      fireEvent.change(fpCountValue(), { target: { value: '3.5' } });
      fireEvent.blur(fpCountValue());

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('alertZeroFpCountThresholdField')).toHaveTextContent(
        'Must be a whole number of at least 1.'
      );
    });

    it('accepts the boundary value 1', () => {
      const { onChange, fpCountValue } = renderFields();

      fireEvent.change(fpCountValue(), { target: { value: '1' } });
      fireEvent.blur(fpCountValue());

      expect(onChange).toHaveBeenCalledWith({ fpCountThreshold: 1 });
    });
  });

  it('re-syncs drafts when the server echoes different values', () => {
    const { rerender, confidenceValue, fpCountValue } = renderFields({
      current: { confidenceThreshold: 0.85, fpCountThreshold: 10 },
    });

    rerender(
      <DetectionConfigFields
        workerId={TRIAGE}
        current={{ confidenceThreshold: 0.5, fpCountThreshold: 20 }}
        autonomy="manual"
        onChange={jest.fn()}
      />
    );

    expect(confidenceValue().value).toBe('0.5');
    expect(fpCountValue().value).toBe('20');
  });

  it('falls back to the prototype defaults when detectionConfig omits a field', () => {
    const { confidenceValue, fpCountValue } = renderFields({ current: {} });

    expect(confidenceValue().value).toBe('0.85');
    expect(fpCountValue().value).toBe('10');
  });
});
