/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { HelpText } from './help_text';
import type { SecurityJob } from '../../../../common/components/ml_popover/types';

jest.mock('../../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          getUrlForApp: () => '/app/ml',
        },
      },
    }),
  };
});

describe('MlJobSelect help text', () => {
  it('does not show warning if all jobs are running', () => {
    const jobs = [
      {
        id: 'test-id',
        jobState: 'opened',
        datafeedState: 'opened',
      },
    ] as SecurityJob[];
    const selectedJobIds = ['test-id'];

    const wrapper = shallow(<HelpText jobs={jobs} selectedJobIds={selectedJobIds} />);
    expect(wrapper.find('[data-test-subj="ml-warning-not-running-jobs"]')).toHaveLength(0);
  });

  it('shows warning if there are jobs not running', () => {
    const jobs = [
      {
        id: 'test-id',
        jobState: 'closed',
        datafeedState: 'stopped',
      },
    ] as SecurityJob[];
    const selectedJobIds = ['test-id'];

    const wrapper = shallow(<HelpText jobs={jobs} selectedJobIds={selectedJobIds} />);
    expect(wrapper.find('[data-test-subj="ml-warning-not-running-jobs"]')).toHaveLength(1);
  });
});
