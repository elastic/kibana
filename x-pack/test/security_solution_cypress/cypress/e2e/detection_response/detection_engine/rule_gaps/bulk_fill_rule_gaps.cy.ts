/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enableSelectedRules, scheduleBulkFillGapsForSelectedRules } from '../../../../tasks/rules_bulk_actions';
import { MODAL_ERROR_BODY, TOASTER_BODY } from '../../../../screens/alerts_detection_rules';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
    disableAutoRefresh,
    clickErrorToastBtn,
    selectAllRules,
    selectRulesByName,
} from '../../../../tasks/alerts_detection_rules';
import { getNewRule } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';

describe('bulk fill rule gaps', {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
        ftrConfig: {
            kbnServerArgs: [
                `--xpack.securitySolution.enableExperimental=${JSON.stringify([
                    'storeGapsInEventLogEnabled',
                ])}`,
            ],
        },
    },
}, () => {
    beforeEach(() => {
        login();
        deleteAlertsAndRules();

        const defaultValues = { enabled: false, interval: '5s', from: 'now-1s' };
        Array.from({ length: 5 }).forEach((_, idx) => {
            const ruleId = String(idx + 1)
            createRule(getNewRule({ rule_id: ruleId, name: `Rule ${ruleId}`, ...defaultValues }));
        })

        // Create gas
        cy.wait(10000)

        visitRulesManagementTable();
        disableAutoRefresh();

        const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
        selectRulesByName(enabledRules);
        enableSelectedRules()
        cy.wait(10000)
    });

    it('schedule enabled rules', () => {
        const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
        selectRulesByName(enabledRules);

        const enabledCount = enabledRules.length;
        const disabledCount = 0;
        scheduleBulkFillGapsForSelectedRules(enabledCount, disabledCount);

        cy.contains(TOASTER_BODY, `Successfully scheduled gaps filling for ${enabledCount} rules`);
    });

    it('schedule enable rules and show warning about disabled rules', () => {
        const enabledRules = ['Rule 1', 'Rule 2', 'Rule 4'] as const;
        const disabledRules = ['Rule 3', 'Rule 5'] as const;
        selectRulesByName([...enabledRules, ...disabledRules]);

        const enabledCount = enabledRules.length;
        const disabledCount = disabledRules.length;
        scheduleBulkFillGapsForSelectedRules(enabledCount, disabledCount);

        cy.contains(TOASTER_BODY, `Successfully scheduled gaps filling for ${enabledCount} rule`);
    });

    it('schedule enable rules and show partial error for disabled rules when all rules are selected', () => {
        selectAllRules();

        const enabledCount = 3;
        const disabledCount = 2;
        scheduleBulkFillGapsForSelectedRules(enabledCount, disabledCount);

        cy.contains(
            TOASTER_BODY,
            `${disabledCount} rules failed to schedule bulk fill rule gaps.See the full error`
        );

        // on error toast button click display error that it is not possible to schedule bulk fill rule gaps for disabled rules
        clickErrorToastBtn();
        cy.contains(MODAL_ERROR_BODY, 'Cannot schedule bulk fill rule gaps for a disabled rule');
    });
});
