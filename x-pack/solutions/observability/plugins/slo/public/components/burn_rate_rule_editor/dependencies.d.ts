import React from 'react';
import type { Dependency } from '../../../common/burn_rate_rule/types';
interface DependenciesProps {
    currentRuleId?: string;
    dependencies: Dependency[];
    onChange: (depencencies: Dependency[]) => void;
}
export declare function Dependencies({ currentRuleId, dependencies, onChange }: DependenciesProps): React.JSX.Element;
export {};
