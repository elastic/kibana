/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import type { ProcessDescendantsIndicatorProps } from './process_descendants_indicator';
import { ProcessDescendantsIndicator } from './process_descendants_indicator';
import type { AnyArtifact } from '../../types';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import {
  FILTER_PROCESS_DESCENDANTS_TAG,
  GLOBAL_ARTIFACT_TAG,
  TRUSTED_PROCESS_DESCENDANTS_TAG,
} from '../../../../../../common/endpoint/service/artifacts/constants';
import { EVENT_FILTERS_PROCESS_DESCENDANT_DECORATOR_LABELS } from '../../../../pages/event_filters/view/translations';
import { TRUSTED_APPS_PROCESS_DESCENDANT_DECORATOR_LABELS } from '../../../../pages/trusted_apps/view/translations';

describe('ProcessDescendantIndicator', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let props: ProcessDescendantsIndicatorProps;
  let render: () => ReturnType<AppContextTestRender['render']>;

  const getStandardEventFilter: () => AnyArtifact = () =>
    ({
      tags: [GLOBAL_ARTIFACT_TAG],
    } as Partial<AnyArtifact> as AnyArtifact);

  const getProcessDescendantEventFilter: () => AnyArtifact = () =>
    ({
      tags: [GLOBAL_ARTIFACT_TAG, FILTER_PROCESS_DESCENDANTS_TAG],
    } as Partial<AnyArtifact> as AnyArtifact);

  const getProcessDescendantTrustedApp: () => AnyArtifact = () =>
    ({
      tags: [GLOBAL_ARTIFACT_TAG, TRUSTED_PROCESS_DESCENDANTS_TAG],
    } as Partial<AnyArtifact> as AnyArtifact);

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    props = {
      item: getStandardEventFilter(),
      labels: EVENT_FILTERS_PROCESS_DESCENDANT_DECORATOR_LABELS,
      processDescendantsTag: FILTER_PROCESS_DESCENDANTS_TAG,
      'data-test-subj': 'test',
    };
    render = () => {
      renderResult = appTestContext.render(<ProcessDescendantsIndicator {...props} />);
      return renderResult;
    };
  });

  it('should not display anything if Event Filter or Trusted App is not for process descendants', () => {
    render();

    expect(renderResult.queryByTestId('test-processDescendantsIndication')).not.toBeInTheDocument();
  });

  it('should display indication if Event Filter is for process descendants', () => {
    props = {
      ...props,
      item: getProcessDescendantEventFilter(),
    };
    render();

    expect(renderResult.getByTestId('test-processDescendantsIndication')).toBeInTheDocument();
  });

  it('should display indication if Trusted App is for process descendants', () => {
    props = {
      ...props,
      item: getProcessDescendantTrustedApp(),
      labels: TRUSTED_APPS_PROCESS_DESCENDANT_DECORATOR_LABELS,
      processDescendantsTag: TRUSTED_PROCESS_DESCENDANTS_TAG,
    };

    render();

    expect(renderResult.getByTestId('test-processDescendantsIndication')).toBeInTheDocument();
  });

  it('should mention additional `event.category is process` entry in tooltip for event filters', async () => {
    const prefix = 'test-processDescendantsIndicationTooltip';
    props = {
      ...props,
      item: getProcessDescendantEventFilter(),
    };
    render();
    expect(renderResult.queryByTestId(`${prefix}-tooltipText`)).not.toBeInTheDocument();

    await userEvent.hover(renderResult.getByTestId(`${prefix}-tooltipIcon`));
    expect(await renderResult.findByTestId(`${prefix}-tooltipText`)).toBeInTheDocument();
  });
});
