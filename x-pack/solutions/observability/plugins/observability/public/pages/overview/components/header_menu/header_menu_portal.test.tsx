/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import HeaderMenuPortal from './header_menu_portal';

describe('HeaderMenuPortal', () => {
  describe('when unmounted', () => {
    it('calls setHeaderActionMenu with undefined', () => {
      const setHeaderActionMenu = jest.fn();
      const coreStart = coreMock.createStart();

      const { unmount } = render(
        <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} {...coreStart}>
          test
        </HeaderMenuPortal>
      );

      unmount();

      expect(setHeaderActionMenu).toHaveBeenCalledWith(undefined);
    });
  });
});
