/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DetectionConfigFields } from './detection_config_fields';

const TRIAGE_WORKER_ID = 'system-security-floor-alert-triage';

describe('DetectionConfigFields (Sep 14 Auto-close group)', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders the Auto-close group with the minimum confidence row', () => {
    render(
      <DetectionConfigFields
        workerId={TRIAGE_WORKER_ID}
        current={{ confidenceThreshold: 0.8, fpCountThreshold: 3 }}
        autonomy="assisted"
        isDisabled={false}
        onChange={onChange}
      />
    );
    expect(screen.getByText('Auto-close')).toBeInTheDocument();
    expect(screen.getByTestId(`alertZeroMinConfidence-${TRIAGE_WORKER_ID}`)).toBeInTheDocument();
  });

  it('commits a valid confidence value on commit', () => {
    render(
      <DetectionConfigFields
        workerId={TRIAGE_WORKER_ID}
        current={{ confidenceThreshold: 0.8, fpCountThreshold: 3 }}
        autonomy="assisted"
        isDisabled={false}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByTestId(`alertZeroMinConfidence-${TRIAGE_WORKER_ID}`), {
      target: { value: '0.9' },
    });
    fireEvent.blur(screen.getByTestId(`alertZeroMinConfidence-${TRIAGE_WORKER_ID}`));
    expect(onChange).toHaveBeenLastCalledWith({
      confidenceThreshold: 0.9,
      fpCountThreshold: 3,
    });
  });

  it('shows an inline error and does not commit out-of-range values', () => {
    render(
      <DetectionConfigFields
        workerId={TRIAGE_WORKER_ID}
        current={{ confidenceThreshold: 0.8, fpCountThreshold: 3 }}
        autonomy="assisted"
        isDisabled={false}
        onChange={onChange}
      />
    );
    const field = screen.getByTestId(`alertZeroMinConfidence-${TRIAGE_WORKER_ID}`);
    fireEvent.change(field, { target: { value: '1.5' } });
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
  });
});
