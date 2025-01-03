/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleProps } from '../..';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { getConsoleTestSetup } from '../../mocks';
import userEvent from '@testing-library/user-event';

type Render = (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
type RenderResult = ReturnType<Render>;
type PromisifiedRender = (...args: Parameters<Render>) => Promise<RenderResult>;

describe('When displaying the side panel', () => {
  let render: Render;
  let renderResult: RenderResult;

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    render = (props = {}) => {
      renderResult = testSetup.renderConsole(props);
      return renderResult;
    };
  });

  describe('and displaying Help content', () => {
    let renderAndOpenHelp: PromisifiedRender;

    beforeEach(() => {
      renderAndOpenHelp = async (props) => {
        render(props);
        await userEvent.click(renderResult.getByTestId('test-header-helpButton'));

        expect(renderResult.getByTestId('test-sidePanel')).toBeTruthy();

        return renderResult;
      };
    });

    it('should display the help panel content', async () => {
      await renderAndOpenHelp();

      expect(renderResult.getByTestId('test-sidePanel-helpContent')).toBeTruthy();
    });
  });
});
