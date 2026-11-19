/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConsoleTestSetup } from '../mocks';
import { consoleTranslations } from './translations';

describe('Console: ConsoleInfo', () => {
  it('should render console info. when console is opened', async () => {
    const testSetup = getConsoleTestSetup();
    const renderResult = testSetup.renderConsole();

    // Verify keyboard helpers are displayed
    expect(renderResult.getByText('Keyboard helpers')).toBeInTheDocument();
    expect(renderResult.getByText(consoleTranslations.keyTabInfo)).toBeInTheDocument();
    expect(renderResult.getByText(consoleTranslations.keyUpArrowInfo)).toBeInTheDocument();
    expect(renderResult.getByText(consoleTranslations.keyAltSpaceInfo)).toBeInTheDocument();
    expect(renderResult.getByText(consoleTranslations.escapeDoubleDashesInfo)).toBeInTheDocument();
  });
});
