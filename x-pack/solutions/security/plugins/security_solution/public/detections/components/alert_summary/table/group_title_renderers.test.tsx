/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  groupTitleRenderers,
  INTEGRATION_GROUP_RENDERER_INTEGRATION_ICON_TEST_ID,
  INTEGRATION_GROUP_RENDERER_INTEGRATION_NAME_TEST_ID,
  INTEGRATION_GROUP_RENDERER_TEST_ID,
  IntegrationNameGroupContent,
  RELATED_INTEGRATION_GROUP_RENDERER_TEST_ID,
} from './group_title_renderers';
import { render } from '@testing-library/react';
import { defaultGroupTitleRenderers } from '../../alerts_table/grouping_settings';
import React from 'react';
import { useTableSectionContext } from './table_section_context';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import { usePackageIconType } from '@kbn/fleet-plugin/public/hooks';
import { RELATED_INTEGRATION } from '../../../constants';

jest.mock('./table_section_context');
jest.mock('@kbn/fleet-plugin/public/hooks');

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    icons: [{ src: 'icon.svg', path: 'mypath/icon.svg', type: 'image/svg+xml' }],
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '0.1.0',
  },
];

describe('groupTitleRenderers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');
  });

  it('should render correctly for relatedIntegration field', () => {
    (useTableSectionContext as jest.Mock).mockReturnValue({
      packages,
    });

    const { getByTestId } = render(
      groupTitleRenderers(
        RELATED_INTEGRATION,
        {
          key: ['splunk'],
          doc_count: 10,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId(INTEGRATION_GROUP_RENDERER_TEST_ID)).toBeInTheDocument();
  });

  it('should render correctly for kibana.alert.rule.name field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'kibana.alert.rule.name',
        {
          key: ['Rule name test', 'Some description'],
          doc_count: 10,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('rule-name-group-renderer')).toBeInTheDocument();
  });

  it('should render correctly for host.name field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'host.name',
        {
          key: 'Host',
          doc_count: 2,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('host-name-group-renderer')).toBeInTheDocument();
  });

  it('should render correctly for user.name field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'user.name',
        {
          key: 'User test',
          doc_count: 1,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('user-name-group-renderer')).toBeInTheDocument();
  });

  it('should render correctly for source.ip field', () => {
    const { getByTestId } = render(
      defaultGroupTitleRenderers(
        'source.ip',
        {
          key: 'sourceIp',
          doc_count: 23,
        },
        'This is a null group!'
      )!
    );

    expect(getByTestId('source-ip-group-renderer')).toBeInTheDocument();
  });

  it('should return undefined when the renderer does not exist', () => {
    const wrapper = groupTitleRenderers(
      'process.name',
      {
        key: 'process',
        doc_count: 10,
      },
      'This is a null group!'
    );

    expect(wrapper).toBeUndefined();
  });
});

describe('IntegrationNameGroupContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePackageIconType as jest.Mock).mockReturnValue('iconType');
  });

  it('should render the integration name and icon when a matching rule is found', () => {
    (useTableSectionContext as jest.Mock).mockReturnValue({
      packages,
    });

    const { getByTestId, queryByTestId } = render(<IntegrationNameGroupContent title="splunk" />);

    expect(getByTestId(INTEGRATION_GROUP_RENDERER_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(INTEGRATION_GROUP_RENDERER_INTEGRATION_NAME_TEST_ID)).toHaveTextContent(
      'Splunk'
    );
    expect(getByTestId(INTEGRATION_GROUP_RENDERER_INTEGRATION_ICON_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(RELATED_INTEGRATION_GROUP_RENDERER_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render title when no matching integration is found', () => {
    (useTableSectionContext as jest.Mock).mockReturnValue({
      packages: [],
    });

    const { getByTestId, queryByTestId } = render(<IntegrationNameGroupContent title="test" />);

    expect(getByTestId(RELATED_INTEGRATION_GROUP_RENDERER_TEST_ID)).toHaveTextContent('test');
    expect(queryByTestId(INTEGRATION_GROUP_RENDERER_TEST_ID)).not.toBeInTheDocument();
    expect(
      queryByTestId(INTEGRATION_GROUP_RENDERER_INTEGRATION_NAME_TEST_ID)
    ).not.toBeInTheDocument();
    expect(
      queryByTestId(INTEGRATION_GROUP_RENDERER_INTEGRATION_ICON_TEST_ID)
    ).not.toBeInTheDocument();
  });
});
