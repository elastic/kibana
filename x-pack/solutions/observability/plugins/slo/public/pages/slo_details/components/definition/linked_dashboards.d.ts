import React from 'react';
import type { SLODefinition } from '../../../../../server/domain/models';
interface Props {
    dashboards: NonNullable<NonNullable<SLODefinition['artifacts']>['dashboards']>;
}
export declare function LinkedDashboards({ dashboards }: Props): React.JSX.Element;
export {};
