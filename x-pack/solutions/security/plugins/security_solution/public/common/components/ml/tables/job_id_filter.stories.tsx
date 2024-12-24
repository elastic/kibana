/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import type { ReactNode } from 'react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';
import { action } from '@storybook/addon-actions';
import { JobIdFilter } from './job_id_filter';

const withTheme = (storyFn: () => ReactNode) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: true })}>{storyFn()}</ThemeProvider>
);

storiesOf('JobIdFilter', module)
  .addDecorator(withTheme)
  .add('empty', () => (
    <JobIdFilter
      title="Job id"
      selectedJobIds={[]}
      jobIds={[]}
      jobNameById={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('one selected item', () => (
    <JobIdFilter
      title="Job id"
      selectedJobIds={['test_job_1']}
      jobIds={['test_job_1', 'test_job_2', 'test_job_3', 'test_job_4']}
      jobNameById={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('multiple selected item', () => (
    <JobIdFilter
      title="Job id"
      selectedJobIds={['test_job_2', 'test_job_3']}
      jobIds={['test_job_1', 'test_job_2', 'test_job_3', 'test_job_4']}
      jobNameById={{}}
      onSelect={action('onSelect')}
    />
  ))
  .add('no selected item', () => (
    <JobIdFilter
      title="Job id"
      selectedJobIds={[]}
      jobIds={['test_job_1', 'test_job_2', 'test_job_3', 'test_job_4']}
      jobNameById={{}}
      onSelect={action('onSelect')}
    />
  ));
