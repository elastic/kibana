/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import type { ComponentProps } from 'react';
import React from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import type { ColumnHeaderOptions } from '../../../../common/types';
import { mockBrowserFields } from '../../../common/containers/source/mock';
import { DragDropContextWrapper } from '../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../common/mock';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';
import type { TimelineNonEcsData } from '../../../../common/search_strategy/timeline';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { CellValue } from './render_cell_value';
import { SourcererScopeName } from '../../../sourcerer/store/model';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    browserFields: {},
    defaultIndex: 'defaultIndex',
    loading: false,
    indicesExist: true,
    sourcererDataView: {},
  }),
}));
jest.mock('../../../common/components/guided_onboarding_tour/tour_step');

describe('RenderCellValue', () => {
  const columnId = '@timestamp';
  const eventId = '_id-123';
  const linkValues = ['foo', 'bar', '@baz'];
  const rowIndex = 5;
  const scopeId = 'table-test';

  let data: TimelineNonEcsData[];
  let header: ColumnHeaderOptions;
  let props: ComponentProps<typeof CellValue>;

  beforeEach(() => {
    data = cloneDeep(mockTimelineData[0].data);
    header = cloneDeep(defaultHeaders[0]);
    props = {
      columnId,
      legacyAlert: data,
      eventId,
      header,
      isDetails: false,
      isExpandable: false,
      isExpanded: false,
      linkValues,
      rowIndex,
      colIndex: 0,
      setCellProps: jest.fn(),
      scopeId,
      rowRenderers: defaultRowRenderers,
      asPlainText: false,
      ecsData: undefined,
      truncate: false,
      context: undefined,
      browserFields: {},
    } as unknown as ComponentProps<typeof CellValue>;
  });

  test('it forwards the `CellValueElementProps` to the `DefaultCellRenderer`', () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <CellValue
            {...props}
            sourcererScope={SourcererScopeName.default}
            tableType={TableId.test}
          />
        </DragDropContextWrapper>
      </TestProviders>
    );

    const { legacyAlert, ...defaultCellRendererProps } = props;

    expect(wrapper.find(DefaultCellRenderer).props()).toEqual({
      ...defaultCellRendererProps,
      data: legacyAlert,
      scopeId: SourcererScopeName.default,
    });
  });

  test('it renders a GuidedOnboardingTourStep', () => {
    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <CellValue {...props} scopeId={SourcererScopeName.default} tableType={TableId.test} />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="GuidedOnboardingTourStep"]').exists()).toEqual(true);
  });
});
