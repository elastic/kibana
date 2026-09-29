/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { shallow } from 'enzyme';

import { MlJobSelect } from '.';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useFormFieldMock } from '../../../../common/mock';
vi.mock('../../../../common/components/ml_popover/hooks/use_security_jobs');
vi.mock('../../../../common/lib/kibana');

describe('MlJobSelect', () => {
  beforeAll(() => {
    (useSecurityJobs as Mock).mockReturnValue({ loading: false, jobs: [] });
  });

  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock<string[]>({ value: [] });

      return <MlJobSelect field={field} loading={false} jobs={[]} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="mlJobSelect"]')).toHaveLength(1);
  });
});
