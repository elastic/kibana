import React from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { SloRule } from '../../hooks/use_fetch_slos_with_burn_rate_rules';
import type { Dependency } from '../../../common/burn_rate_rule/types';
interface DependencyEditorProps {
    isLoading: boolean;
    onSubmit: (dependency: Dependency) => void;
    dependency?: Dependency;
    rules?: Array<Rule<SloRule>>;
}
export declare function DependencyEditor({ isLoading, onSubmit, dependency, rules, }: DependencyEditorProps): React.JSX.Element;
export {};
