/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues } from '../../../../__mocks__/kea_logic';
import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { WorkplaceSearchPageTemplate, PersonalDashboardLayout } from '../../../components/layout';

import { DownloadDiagnosticsButton } from './download_diagnostics_button';
import { SourceInfoCard } from './source_info_card';
import { SourceLayout } from './source_layout';

describe('SourceLayout', () => {
  const contentSource = contentSources[1];
  const mockValues = {
    contentSource,
    dataLoading: false,
    diagnosticDownloadButtonVisible: false,
    isOrganization: true,
  };

  beforeEach(() => {
    setMockValues({ ...mockValues });
  });

  it('renders', () => {
    const wrapper = shallow(
      <SourceLayout>
        <div className="testChild" />
      </SourceLayout>
    );

    expect(wrapper.find(SourceInfoCard)).toHaveLength(1);
    expect(wrapper.find('.testChild')).toHaveLength(1);
  });

  it('passes a content source to SourceInfoCard', () => {
    const wrapper = shallow(<SourceLayout />);

    expect(wrapper.find(SourceInfoCard).prop('contentSource')).toEqual(contentSource);
  });

  it('renders the default Workplace Search layout when on an organization view', () => {
    setMockValues({ ...mockValues, isOrganization: true });
    const wrapper = shallow(<SourceLayout />);

    expect(wrapper.type()).toEqual(WorkplaceSearchPageTemplate);
  });

  it('renders a personal dashboard layout when not on an organization view', () => {
    setMockValues({ ...mockValues, isOrganization: false });
    const wrapper = shallow(<SourceLayout />);

    expect(wrapper.type()).toEqual(PersonalDashboardLayout);
  });

  it('passes any page template props to the underlying page template', () => {
    const wrapper = shallow(<SourceLayout pageViewTelemetry="test" />);

    expect(wrapper.find(WorkplaceSearchPageTemplate).prop('pageViewTelemetry')).toEqual('test');
  });

  it('handles breadcrumbs while loading', () => {
    setMockValues({
      ...mockValues,
      contentSource: {},
      dataLoading: true,
    });
    const wrapper = shallow(<SourceLayout />);

    expect(wrapper.prop('pageChrome')).toEqual(['Sources', '...']);
  });

  it('renders a callout when the source is not supported by the current license', () => {
    setMockValues({ ...mockValues, contentSource: { supportedByLicense: false } });
    const wrapper = shallow(<SourceLayout />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('renders DownloadDiagnosticsButton', () => {
    setMockValues({
      ...mockValues,
      diagnosticDownloadButtonVisible: true,
    });
    const wrapper = shallow(<SourceLayout />);

    expect(wrapper.find(DownloadDiagnosticsButton)).toHaveLength(1);
  });
});
