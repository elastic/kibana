/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { docLinks } from '../doc_links';

import { EuiButtonTo } from '../react_router_helpers';

import { ManageLicenseButton } from '.';

describe('ManageLicenseButton', () => {
  describe('when the user can access license management', () => {
    it('renders a SPA link to the license management plugin', () => {
      setMockValues({ canManageLicense: true });
      const wrapper = shallow(<ManageLicenseButton />);

      expect(wrapper.find(EuiButtonTo).prop('to')).toEqual(
        '/app/management/stack/license_management'
      );
    });
  });

  describe('when the user cannot access license management', () => {
    it('renders an external link to our license management documentation', () => {
      setMockValues({ canManageLicense: false });
      const wrapper = shallow(<ManageLicenseButton />);

      expect(wrapper.find(EuiButton).prop('href')).toEqual(
        expect.stringContaining(docLinks.licenseManagement)
      );
    });
  });
});
