/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EnrichmentButtonContent } from './threat_details_view_enrichment_button_content';
import { THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID } from './test_ids';

describe('EnrichmentButtonContent', () => {
  it('should render string with feedName if feedName is present', () => {
    const wrapper = mount(
      <EnrichmentButtonContent field={'source.ip'} value={'127.0.0.1'} feedName={'eceintel'} />
    );
    expect(
      wrapper
        .find(`[data-test-subj="${THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID}"]`)
        .hostNodes()
        .text()
    ).toEqual('source.ip 127.0.0.1 from eceintel');
  });

  it('should enders string without feedName if feedName is not present', () => {
    const wrapper = mount(<EnrichmentButtonContent field={'source.ip'} value={'127.0.0.1'} />);
    expect(
      wrapper
        .find(`[data-test-subj="${THREAT_INTELLIGENCE_ENRICHMENTS_BUTTON_CONTENT_TEST_ID}"]`)
        .hostNodes()
        .text()
    ).toEqual('source.ip 127.0.0.1');
  });
});
