/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
    const PageObjects = getPageObjects(['common']);
    const observability = getService('observability');
    const a11y = getService('a11y');

    describe.only('Observability UI', () => {
        before(async () => {
            await PageObjects.common.navigateToApp('observability');
        });

        it('Overview', async () => {
            await a11y.testAppSnapshot();
        });
    });
}