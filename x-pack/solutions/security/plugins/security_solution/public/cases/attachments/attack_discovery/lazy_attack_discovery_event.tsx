/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { IAttackDiscoveryAttachmentProps } from './types';

const AttackDiscoveryEvent = lazy(() => import('./attack_discovery_event'));

export const getLazyAttackDiscoveryEvent = (props: IAttackDiscoveryAttachmentProps) => {
    return (
        <Suspense fallback={null}>
            <AttackDiscoveryEvent {...props} />
        </Suspense>
    );
};




