import React from 'react';
import type { Rule } from '@kbn/alerts-ui-shared';
import type { TopAlert } from '../../../typings/alerts';
export declare function AddToCaseButton({ alert, alertIndex, rule, setIsPopoverOpen, }: {
    alert: TopAlert | null;
    alertIndex?: string;
    rule?: Rule;
    setIsPopoverOpen: (isOpen: boolean) => void;
}): React.JSX.Element;
