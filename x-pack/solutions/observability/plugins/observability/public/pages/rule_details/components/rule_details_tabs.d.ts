import React from 'react';
import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { BoolQuery } from '@kbn/es-query';
import type { TabId } from '../rule_details';
interface Props {
    activeTabId: TabId;
    esQuery: {
        bool: BoolQuery;
    } | undefined;
    ruleTypeIds?: string[];
    rule: Rule<RuleTypeParams>;
    ruleId: string;
    ruleType: any;
    onEsQueryChange: (query: {
        bool: BoolQuery;
    }) => void;
    onSetTabId: (tabId: TabId) => void;
    onControlApiAvailable?: (controlGroupHandler: FilterGroupHandler | undefined) => void;
    controlApi?: FilterGroupHandler;
}
export declare function RuleDetailsTabs({ activeTabId, esQuery, ruleTypeIds, rule, ruleId, ruleType, onSetTabId, onEsQueryChange, onControlApiAvailable, controlApi, }: Props): React.JSX.Element;
export {};
