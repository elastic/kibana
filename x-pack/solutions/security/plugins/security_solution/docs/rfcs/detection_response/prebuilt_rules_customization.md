# RFC: Prebuilt Rules Customization

_Status_: Completed, feedback addressed. Awaiting further feedback, or closing off.

Covers:

- rule schema changes
- mappings
- migration strategy and technical implementation
- exporting and importing rules
- schema-related changes needed in endpoints
- calculation of `isCustomized` field on endpoints that update/patch rules.
- additional changes needed to `/upgrade/_review` and `/upgrade/_perform` endpoints
- UI Changes

## Table of Contents

The following TOC was created using the [Pandoc](https://pandoc.org/installing.html) tool.

You can create it by navigating to the directory of the markdown file and running the command below and pasting the generated table from the output document into the current one:

```
pandoc prebuilt_rules_customization_rfc.md --toc --toc-depth=6 --wrap=none  -s -o output.md
```

-   [Table of Contents](#table-of-contents)
-   [Note about scope of RFC](#note-about-scope-of-rfc)
-   [Necessary rule schema changes](#necessary-rule-schema-changes)
    -   [`rule_source` field](#rule_source-field)
    -   [`immutable` field](#immutable-field)
    -   [Changes needed in rule schema](#changes-needed-in-rule-schema)
        -   [API request and response rule schema](#api-request-and-response-rule-schema)
        -   [Rule Import request schema](#rule-import-request-schema)
        -   [Internal rule schema](#internal-rule-schema)
        -   [Prebuilt Rule asset schema](#prebuilt-rule-asset-schema)
    -   [Deprecating the `immutable` field](#deprecating-the-immutable-field)
-   [Mapping changes](#mapping-changes)
-   [Plan for carrying out migrations of rule SOs](#plan-for-carrying-out-migrations-of-rule-sos)
    -   [Context](#context)
    -   [Problem with tightly coupled logic in our endpoints](#problem-with-tightly-coupled-logic-in-our-endpoints)
    -   [Migration strategy](#migration-strategy)
        -   [Normalization on read](#normalization-on-read)
        -   [Migration on write](#migration-on-write)
    -   [Technical implementation of migration-on-write](#technical-implementation-of-migration-on-write)
        -   [Updating and upgrading rules](#updating-and-upgrading-rules)
        -   [Bulk editing rules](#bulk-editing-rules)
-   [Endpoints and utilities that will need to be adapted to the new schema](#endpoints-and-utilities-that-will-need-to-be-adapted-to-the-new-schema)
    -   [Utilities](#utilities)
        -   [KQL filters and the `convertRulesFilterToKQL` method](#kql-filters-and-the-convertrulesfiltertokql-method)
    -   [Rule Management endpoints](#rule-management-endpoints)
    -   [Prebuilt Rules endpoints](#prebuilt-rules-endpoints)
    -   [Rule monitoring endpoints](#rule-monitoring-endpoints)
    -   [Rule Execution Logs](#rule-execution-logs)
-   [Exporting and importing rules](#exporting-and-importing-rules)
    -   [Exporting rules](#exporting-rules)
    -   [Importing rules](#importing-rules)
    -   [Handling the `version` parameter](#handling-the-version-parameter)
-   [Customizing Prebuilt Rules](#customizing-prebuilt-rules)
    -   [Endpoints](#endpoints)
        -   [Changes needed to endpoints](#changes-needed-to-endpoints)
        -   [Updating the `is_customized` field](#updating-the-is_customized-field)
    -   [In the UI](#in-the-ui)
        -   [Via the Rule Edit Page](#via-the-rule-edit-page)
        -   [Via Rules Table page](#via-rules-table-page)
        -   [Via Bulk Actions](#via-bulk-actions)
        -   [Via the Rules Details Page](#via-the-rules-details-page)
        -   [Via the Shared Exception Lists page](#via-the-shared-exception-lists-page)
        -   [Via the Stack Management \> Rules UI](#via-the-stack-management-rules-ui)
-   [Design Discussion link](#design-discussion-link)
-   [Upgrading Prebuilt Rules](#upgrading-prebuilt-rules)
    -   [Changes to `/upgrade/_perform` endpoint](#changes-to-upgrade_perform-endpoint)
    -   [Changes to `/upgrade/_review` endpoint](#changes-to-upgrade_review-endpoint)
    -   [Concrete field diff algorithms by type](#concrete-field-diff-algorithms-by-type)
        -   [Single-line string fields](#single-line-string-fields)
        -   [Multi-line string fields](#multi-line-string-fields)
        -   [Number fields](#number-fields)
        -   [Array of scalar value (strings/numbers) fields](#array-of-scalar-value-stringsnumbers-fields)
        -   [Array of objects fields](#array-of-objects-fields)
    -   [Changes to Rule Upgrade UX/UI flow](#changes-to-rule-upgrade-uxui-flow)
        -   [Bulk accepting upgrades with no conflicts](#bulk-accepting-upgrades-with-no-conflicts)
        -   [Upgrading rules with conflicts](#upgrading-rules-with-conflicts)

## Note about scope of RFC

This RFC was initially planned to have a scope strictly limited to the Customization of Prebuilt Rules epic. However, another epic is, in parallel, in the discussion phase: the [Detections-as-Code (DaC) epic](https://docs.google.com/document/d/1MfPFa3Io82S91rRfdQde8Xi_9AGEbE44Z2MkIYWD10U/edit).

Both epics have many areas of contact, and features/decisions in one need to take account features in the other.

This RFC includes some decisions that will be taken in order to future-proof our archtecture for the upcoming DaC epic, but the vast majority will refer specifically to the Prebuilt Rules Customization epic. Elastic prebuilt rules will become a specific case of externally sourced rules: in the future, rules can be installed as Elastic prebuilt rules from our `detection-rules` repo, but also from any other repository handled by the user.

During this RFC, we will explicitly refer to case of Elastic prebuilt rules, but take into account that this will be only a specific case of all the possible external sources for rules.

## Necessary rule schema changes

In order to support the customization of Elastic Prebuilt Rules, we need to modify our rule schema. This involves introducing the new top level field: the nested `rule_source` field, as well deprecating the `immutable` field.

```ts
// PSEUDOCODE - see complete schema in detail below
{
  rule_source: {
    type: 'external'
    is_customized: boolean;
    source_updated_at?: Date;
  } | {
    type: 'internal'
  },
}
```


### `rule_source` field

The `rule_source` field will be a top-level object field in our rule schema that will be a discriminated union of two types: `'internal'` and `'external'`.

Rules with `rule_source` of type `internal` are rules generated internally in the Kibana application and which don't have an external origin outside of it.

Rules with `rule_source` of type `external` are rules who have an external origin or source. Elastic prebuilt rules are a case of `external` rule, with the `detection-rules` repository handled by the TRaDE team being their external source origin.

This also means that a rule with this type of `rule_source` will determine that the rule is an Elastic Prebuilt Rule that can receive upstream updates via Fleet. This field is intended to partly replace the currently existing `immutable` field, which is used today for the same purpose, but -as its name indicates- also currently determines if a rule's fields can be modified/customized.

Prebuilt rules will have:

```ts
{  
  rule_source: {  
    /**  
     * The discriminant of the discriminated union type of the `rule_source` field.  
     */  
    type: 'external';  

    /**  
     * Determines whether the rule (which is prebuilt/external) has been customized by the user,  
     * i.e. if any of its fields have been modified and diverged from the base version of the rule,  
     * which is the version that is installed from the `security_detection_engine` Fleet package.  
     * The value will be initially set to `false` when a brand new prebuilt rule is installed,  
     * but will be rewritten to `true` if a rule's field is edited and diverges from the value  
     * from the base version of the rule.  
     * See section "Updating the `isCustomized` flag"  
     */  
    is_customized: boolean;  

    /**  
     * A date in ISO 8601 format which describes the last time that this prebuilt rule was created  
     * and subsequently updated by the TRaDE team, the team responsible for creating prebuilt rules.  
     * Its usage is detailed in https://github.com/elastic/detection-rules/issues/2826.  
     * This field will be optional in both the API schema and the internal rule schema, since  
     * this value will not exist for prebuilt rules until a new version of each rule which includes  
     * this field in the prebuilt rule asset is published by the TRaDE team, and the user installs  
     * it or updates to it.
     * NOTE: the field will not be included in first iteration of the implementation. There is a 
     * dependency with the TRaDE team that has blocked the inclusion of this field in the `security-rule` SO, 
     * and the change has therefore been postponed. 
     * See ticket https://github.com/elastic/detection-rules/issues/2826 for details.
     */  
    source_updated_at?: Date;  
  };  
} 
```

Custom rules will have:
```ts
{  
  rule_source: {  
    /**  
     * The discriminant of the discriminated union type of the `rule_source` field.  
     */  
    type: 'internal';  
  };  
}  
```
### `immutable` field

In the current application's state, rules with `immutable: false` are rules which are not Elastic Prebuilt Rules, i.e. custom rules, and can be modified. Meanwhile, `immutable: true` rules are Elastic Prebuilt Rules, created by the TRaDE team, distributed via the `security_detection_engine` Fleet package, and cannot be modified once installed.

When successfully implemented, the `rule_source` field should replace the `immutable` field as a mechanism to mark Elastic prebuilt rules, but with one difference: the `rule_source` field will determine if the rule is an Elastic Prebuilt Rule or not, but now all rules will be customizable by the user in Kibana, i.e. independently of the `type` of `rule_source`.

Because of this difference between the `rule_source` and `immutable` fields, the `immutable` field will lose its original meaning as soon as we allow users to customize prebuilt rules, which might become confusing for those API consumers who interact directly with this field. That's why we want to first deprecate it and later after a large enough deprecation period we could consider removing it completely from the API.

### Changes needed in rule schema

As detailed further down in the [Plan for carrying out migrations of rule SOs](#plan-for-carrying-out-migrations-of-rule-sos) section, we will be performing incremental migration-on-write on our saved objects to get to our new schemas (see details in linked section).

This means that we need to differentiate between changes to the internal rule schema and the API schema.

#### API request and response rule schema

Notice, as well, that `immutable` and `rule_source` will continue to be part **only of the API response schema**, and never form part of the **request parameters**.

The OpenAPI schema will need to be modified so:

_Source: [x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/model/rule_schema/common_attributes.schema.yaml](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/model/rule_schema/common_attributes.schema.yaml)_

```yaml
#  [... file continues above...]

# Add deprecation warning to `immutable` field
IsRuleImmutable:
  type: boolean
  description: '[DEPRECATION WARNING! This field is deprecated and... <the warning explains the deprecation period and suggests a replacement> ] - Determines whether the rule is a prebuilt Elastic rule.'

IsExternalRuleCustomized:
  type: boolean
  description: Determines whether an external/prebuilt rule has been customized by the user (i.e. any of its fields have been modified and diverged from the base value).

ExternalSourceUpdatedAt:
  type: string
  format: date-time
  description: The date and time that the external/prebuilt rule was last updated in its source repository.

InternalRuleSource:
  description: Type of rule source for internally sourced rules, i.e. created within the Kibana apps.
  type: object
  properties:
    type:
      type: string
      enum:
        - internal
  required:
    - type

ExternalRuleSource:
  description: Type of rule source for externally sourced rules, i.e. rules that have an external source, such as the Elastic Prebuilt rules repo.
  type: object
  properties:
    type:
      type: string
      enum:
        - external
    is_customized:
      $ref: '#/components/schemas/IsExternalRuleCustomized'
    source_updated_at:
      $ref: '#/components/schemas/ExternalSourceUpdatedAt'
  required:
    - type
    - is_customized

RuleSource:
  description: Discriminated union that determines whether the rule is internally sourced (created within the Kibana app) or has an external source, such as the Elastic Prebuilt rules repo.
  oneOf:
    - $ref: '#/components/schemas/ExternalRuleSource'
    - $ref: '#/components/schemas/InternalRuleSource'
#  [... file continues below ...]
```

_Source: [x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/model/rule_schema/rule_schemas.schema.yaml](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/model/rule_schema/rule_schemas.schema.yaml)_

```yaml
#  [... file continues above...]

ResponseFields:
  type: object
  properties:
    id:
      $ref: './common_attributes.schema.yaml#/components/schemas/RuleObjectId'
    rule_id:
      $ref: './common_attributes.schema.yaml#/components/schemas/RuleSignatureId'
    immutable:
      $ref: './common_attributes.schema.yaml#/components/schemas/IsRuleImmutable'
    rule_source:
      $ref: './common_attributes.schema.yaml#/components/schemas/RuleSource'
    #  [...  more response fields ...]
  required:
    - id
    - rule_id
    - immutable
    - updated_at
    - updated_by
    - created_at
    - created_by
    - revision
    - rule_source
#  [... file continues below...]
```

#### Rule Import request schema

We also need to modify the `RuleToImport` schema, since now we will be allowing the importing of both custom rules and prebuilt rules.

Currently, `RuleToImport` optionally accepts the `immutable` param, but rejects validation if its value is set to anything else than `false` - since we don't currently support importing prebuilt rules. 

We will be changing the mechanism for importing rules so that onlt the `rule_id` is required parameter. This parameters will be used to determine if the rule is prebuilt or not, and dynamically calculate `rule_source` during import.

The rule import endpoint should:

- for custom rules being imported, if `version` is not specified, set it to `1`.
- for prebuilt rules being imported, if `version` is not specified, throw an error.

See the detailed explanation for this mechanism in the [Exporting and importing rules](#exporting-and-importing-rules) sections.

The `immutable` and `rule_source` fields will be ignored if passed in the request payload.

_Source: [x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/rule_management/import_rules/rule_to_import.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/api/detection_engine/rule_management/import_rules/rule_to_import.ts)_

```ts
// [... file continues above...]
import {
  // [...]
  RuleSignatureId,
  IsRuleImmutable,
  ExternalSourceAttributes,
  RuleVersion,
} from '../../model/rule_schema';

export type RuleToImport = z.infer<typeof RuleToImport>;
export type RuleToImportInput = z.input<typeof RuleToImport>;
export const RuleToImport = BaseCreateProps.and(TypeSpecificCreateProps).and(
  ResponseFields.partial().extend({
    rule_id: RuleSignatureId,
  })
);
```

#### Internal rule schema

**The internal rule schema** needs to represent that the `immutable` and the new `ruleSource` field may not always exist, so they must be optional.

_Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_schema/model/rule_schemas.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_schema/model/rule_schemas.ts)_

```ts
export type BaseRuleParams = z.infer<typeof BaseRuleParams>;
export const BaseRuleParams = z.object({
  // [...]

  immutable: IsRuleImmutable.optional(),
  ruleSource: RuleSource.transform(camelize).optional(),
  // [...]
});
```

> Notice that in the internal schema we cannot simply reuse the `RuleSource` attribute defined for the API schema, since it should have CamelCase and the API schema uses snake_case. We need to apply a transformation to our Zod type. See this [issue](https://github.com/colinhacks/zod/issues/486#issuecomment-1567296747).

In the internal rule schema, there are two additional important reasons why we need to make sure that these two fields optional:

- When rules are executed, a call to the method `validateRuleTypeParams` is done, which is a method that validates the passed rule's parameters using the validators defined in `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types`, within each of the rule query types files (for [EQL rules](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/eql/create_eql_alert_type.ts#L27), for example). The validation is done based on the internal rule schema `BaseRulesParams` displayed above. Having `ruleSource` as required field would cause custom rules or prebuilt rules that haven't had their schema migrated to fail during runtime.
- The Rule Client `update` method also calls the `validateRuleTypeParams` to validate the rule's params. Since the Rule Client's `update` method is used in our endpoint handlers, such as and `/rules/patch` and `/_bulk_actions`, these would fail when executed against a payload of custom rule.

#### Prebuilt Rule asset schema

The `PrebuiltRuleAsset` type needs to be updated to include the new `source_updated_at` date that will be progressively shipped with new versions of rules in the Elastic Prebuilt Rules package.

Notice that this field will be a **top-level field in the Prebuilt Rule asset** schema, but will be part of the `rule_source` field in the API rule schema and internal rule schema.

_Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset.ts)_

```ts
export const PrebuiltRuleAsset = BaseCreateProps.and(TypeSpecificCreateProps).and(
  z.object({
    rule_id: RuleSignatureId,
    version: RuleVersion,
    related_integrations: RelatedIntegrationArray.optional(),
    required_fields: RequiredFieldArray.optional(),
    setup: SetupGuide.optional(),
    source_updated_at: SourceUpdatedAt.optional(), // new optional field
  })
);
```

### Deprecating the `immutable` field

To ensure backward compatibility and avoid breaking changes, we will deprecate the `immutable` field but keep it within the rule schema, asking our users to stop relying on this field in Detection API responses. During the migration period, we want to keep the value of the `immutable` field in sync with the `rule_source` fields: this means that for all rules that have a `immutable` value of `true`, the `rule_source` field will always be of type `'external'`. Viceversa, rules with `immutable: false` will have a `rule_source` field of type `'internal'`.

This means, however, that there will be a change in behaviour of the `immutable` field: with the release of the feature, rules with the `immutable: true` value will now be customizable by the user, which is not the current behaviour.

In order to mark the `immutable` field as deprecated, and making sure that our application and API users are aware that the field has been deprecated and replaced by the `rule_source` field, we will communicate this change in three ways:

1. via updates to the documentation of all endpoints that return `RuleResponse` types
2. via a deprecation warning in the OpenAPI schema, as detailed above
3. by adding a custom response header in said endpoints.

The `immutable` field will afterwards be actually removed from our API endpoint responses and our application after a deprecation period that should give our users enough time to adapt to this change. The length of this deprecation period can vary depending on adoption or other factors, but should be at least 24 months.

Both the docs and the custom response header should communicate that the `immutable` field:

- has been replaced by the `rule_source` field and users should rely on that new field onwards
- is maintained for backwards compatibility reasons only
- will be removed after a specific date/release

The endpoints should be updated to include a custom response header, using the [format we already use for our bulk CRUD endpoints.](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/api/deprecation.ts#L34-L43)

## Mapping changes

**Alert (rule objects) mapping**

No changes will be needed for the [mapping of rule saved objects](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/alerting/common/saved_objects/rules/mappings.ts) (of type `alert`), since the new fields introduced will be part of the `params` field, which is a `flattened` field.

**Security Rules (prebuilt rule assets) mapping**

No changes will be needed either for the `security-rule` [mapping](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_type.ts), our prebuilt rule assets. We currently have mappings for the `rule_id` and `version` fields, since we perform aggregations and filtering on those in the rule install and upgrade endpoints. No additional fields needs to be mapped in this phase.

## Plan for carrying out migrations of rule SOs

### Context

Historically, migrations to Elasticsearch saved objects were carried out by a procedure in which the changes in the SO were described in a migration operation that would be carried out **during an upgrade to a specific Kibana version**. See `x-pack/platform/plugins/shared/alerting/server/saved_objects/migrations/index.ts` for a list of migrations of SO that take place when a user updates Kibana to a specific version.

However, this mechanism is no longer supported by the Alerting Framework team - which maintained it -, and the new migration mechanism introduced to replace that, the [Model Version API](https://github.com/elastic/kibana/blob/main/src/core/packages/saved-objects/server/docs/model_versions.md), which is Serverless-compatible, doesn't support migrating encrypted saved objects.

Since our alerting rules are encrypted saved objects, we have to find an alternative strategy to migrate them. Therefore, we will perform the migration of the saved objects directly in the Detection API's endpoints that interact with them. This means that, instead of all of a user's saved object being migrated in a single operation during a Kibana update, the SO will be migrated when the pertinent endpoints are called. In the next section, we describe which those endpoints are.

Since the migration of rules will be performed as the user calls the pertinent endpoints, the migration of the saved objects will be carried out progressively and incrementally: the SO will be migrated only when a endpoint that handles it is called by the user. We therefore have to assume that, at any given point in time, a user may have a mix of migrated and non-migrated rule saved objects. Consequently, we must continue supporting both versions of SOs.

### Problem with tightly coupled logic in our endpoints

All endpoints belonging to Detection Rules Management that create and update -including upgrade of prebuilt rules to new version- use three CRUD methods under the hood:

- [`createRules`](https://github.com/elastic/kibana/blob/8.0/x-pack/plugins/security_solution/server/lib/detection_engine/rules/create_rules.ts)
- [`patchRules`](https://github.com/elastic/kibana/blob/8.0/x-pack/plugins/security_solution/server/lib/detection_engine/rules/patch_rules.ts)
- [`updateRules`](https://github.com/elastic/kibana/blob/8.0/x-pack/plugins/security_solution/server/lib/detection_engine/rules/update_rules.ts)

This "overuse" of these 3 methods for a variety of user actions makes their logic tightly coupled and creates a considerable amount of complexity to CRUD functions that should remain logically simple.

For example: the `createRules` method is used in 3 use cases:
1. when creating custom rules with our Rule Creation endpoints
2. when importing rules, when the imported `rule_id` does not already exist in Kibana 
3. when upgrading rules, if a rule undergoes a `type` change, the existing rule is deleted a new one is created.

The same happens with `patchRules`. It is used:
1. when patching rules via our Rule Patch endpoints
3. when upgrading rules, if a rule maintains its `type`.

This causes these 3 CRUD functions to have an unnecessary complex interfaces and logic in order to handle all these different use cases.

As part of the epic, we should move away from this practice and create new CRUD methods that handle the different cases mentioned above specifically. This will help simplify our existing methods, keep logic in all of our CRUD methods simple and logically uncoupled from one another.


### Migration strategy

Our migration strategy will consist of two distinct types of migration: a **migration on write** that will update the SO on Elasticsearch, and a **normalization on read**, which will transform legacy rules to the new schema **in memory** on read operations, before returning it as a response from an API endpoint.



| API endpoint | Normalization-on-read | Migration-on-write | Comments |
|-|-|-|-|  
| **Find Rules** - `GET /rules/_find` | <center>✅</center> | <center>❌</center> |  |
| **Read Rule** - `GET /rules` | <center>✅</center> | <center>❌</center> |  |
| **Delete Rules** - `DELETE /rules` | <center>✅</center> | <center>❌</center> |  |
| **Export Rules** - `POST /rules/_export` | <center>✅</center> | <center>❌</center> | - Endpoints is unused in UI, still used via public API <br> - See section [Exporting rules](#exporting-rules) |
| **Import Rules** - `POST /rules/_import` | <center>✅</center> | <center>✅</center> | - See section [Importing rules](#importing-rules) |
| **Update Rule** - `PUT /rules`| <center>✅</center> | <center>✅</center> | - Used in the UI when updating/modifying a single rule via the Rule Editing page |
| **Patch Rule** - `PATCH /rules`| <center>✅</center> | <center>✅</center> | - Used in the UI for attaching shared exceptions list to rules |
| **Bulk Update Rules** - `PUT /rules/_bulk_update`| <center>✅</center> | <center>✅</center> | - Deprecated and unused by the UI. Might still be used by API users |
| **Bulk Patch Rules** - `PATCH /rules/_bulk_update`| <center>✅</center> | <center>✅</center> | - Deprecated and unused by the UI. Might still be used by API users |
| **Perform Rule Upgrade** - `POST /prebuilt_rules/upgrade/_perform` (Internal) | <center>✅</center> | <center>✅</center> | - Current way of upgrading a prebuilt rule |
| **(LEGACY) Install Prebuilt Rules And Timelines** - `PUT /rules/prepackaged` | <center>✅</center> | <center>✅</center> | - Legacy endpoint for installing prebuilt rules and updating rules. |
|**Bulk Actions** - `POST /rules/_bulk_action`: | | | This endpoint includes a `dry_run` mode that is executed to evaluate preconditions and warn the user before executing the actual request. No migration logic should take place for dry run requests, i.e when `dry_run=true`, since we never write to ES when this parameter is set to `true`.|
|  <li>_**Enable and disable action**_</li> | <center>✅</center> | <center>❌</center> | - Migration-on-write is technically possible but we have decided to avoid implementing the additional logic in the AF side. Also, logic should be [migrated](https://github.com/elastic/kibana/issues/177634) soon. |
| <li>_**Delete action**_</li> | <center>✅</center> | <center>❌</center> | - Deletes ES object but returns deleted rules data, so so normalization-on-read is enough. |
| <li>_**Export action**_</li> | <center>✅</center> | <center>❌</center> | - See section [Exporting rules](#exporting-rules) |
| <li>_**Duplicate rule action**_</li> | <center>✅</center> | <center>❌</center> | - Per definition, all duplicated rules will be `custom` rules. That means that all duplicated rules (the duplicates) are newly created and should get a `rule_source` of type `internal`, and no migration-on-write is neccessary. |
| <li>_**Edit rule action**_</li> | <center>✅</center> | <center>✅</center> | - We can take advantage of the `ruleParamsModifier` to carry out the migration-on-write, regardless of the type of edit that is being performed. <br>- See implementation details in the [Bulk editing rules](#bulk-editing-rules) section.
| **Review Rule Installation** - `POST /prebuilt_rules/installation/_review`| <center>✅</center> | <center>❌</center> |  |
| **Perform Rule Installation** - `POST /prebuilt_rules/installation/_install`| <center>✅</center> | <center>❌</center> | - Newly installed rules will be installed with new schema; but no migration-on-write should happen in this endpoint. |
| **Review Rule Upgrade** - `POST /prebuilt_rules/upgrade/_review` | <center>✅</center> | <center>❌</center> |  |
| **Perform Rule Upgrade** - `POST /prebuilt_rules/upgrade/_perform`| <center>✅</center> | <center>✅</center> |  |


#### Normalization on read

All endpoints that respond with a rule Saved Object, typed as `RuleResponse`, will perform **normalization on read**, which will transform legacy rules to the new schema **in memory** on read operation, before returning it as a response from an API endpoint.

This means that the endpoints will always respond with the rules with the new schema, while the actual rule saved object might still be stored with the legacy schema in Elasticsearch, if it still has not been migrated-on-write.

The **normalization on read** will be carried out by a new `normalizeRuleSourceSchemaOnRuleRead` normalization function. The `internalRuleToAPIResponse` method, which is used in our endpoints to convert a rule saved object as is stored in Elasticsearch to the `RuleResponse` type which is returned to the client, calls the `commonParamsCamelToSnake` methods to convert rule parameters that are common to all rule types to what's expected in `RuleResponse`. 

Inside this method, we will use `normalizeRuleSourceSchemaOnRuleRead` to calculate the normalized values of `rule_source` and `immutable`.

_Source: [rule_converters.ts](https://github.com/elastic/kibana/blob/8.0/x-pack/plugins/security_solution/server/lib/detection_engine/schemas/rule_converters.ts)_

```ts
export const internalRuleToAPIResponse = (rule) => {
  return {
    ...commonParamsCamelToSnake(rule.params), // <--- rule params are converted here
    ...typeSpecificCamelToSnake(rule.params),
    // [... more object properties ...]
  };
};

export const commonParamsCamelToSnake = (params: BaseRuleParams) => {
  const { immutable, rule_source } = normalizeRuleSourceSchemaOnRuleRead(params);

  return {
    immutable,
    rule_source,
    // [... more object properties ...]
  };
};
```

And the `normalizeRuleSourceSchemaOnRuleRead` can be defined so:

_Source: x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/normalization/prebuilt_rule_schema_migrations.ts_ (New file)

```ts
interface OnReadNormalizationResult {
  immutable: IsRuleImmutable;
  rule_source: RuleSource
}

const getRuleSourceValueForRuleRead = (ruleParams: BaseRuleParams): RuleSource | undefined => {
  if (ruleParams.rule_source) {
    return ruleParams.rule_source;
  }

  if (ruleParams.immutable) {
    return {
      type: 'external'
      isCustomized: false,
    };
  }

  return {
    type: 'internal'
  };
};

export const normalizePrebuiltSchemaOnRuleRead = (
  ruleParams: BaseRuleParams
): OnReadNormalizationResult => {

/**
 * To calculate `immutable`:
 * - Checks if the `rule_source` field exists in the rule's parameters.
 *   - If `rule_source` exists and its type is external, sets `immutable` to `true`. (Use case of Rules that have already been migrated-on-write)
 *   - If `rule_source` does not exist, return the value of the params' `immutable` field. (Use case of Rules that have not yet been migrated on write.)
 */
  const isRuleSourceExternal = ruleParams.rule_source && ruleParams.rule_source.type === 'external';
  const immutable = Boolean(isRuleSourceExternal) || Boolean(ruleParams.immutable);
  const rule_source = getRuleSourceValueForRuleRead(ruleParams);

  return {
    immutable,
    rule_source,
  };
};
```


#### Migration on write

This type of migration will be in charge of updating saved object fields in Elasticsearch from the legacy form to the new form, and will be performed on all write operations of the rules (see list below). This means that we need to perform this type of migration of rules whenever any endpoint operation that writes/updates a rule saved object is called.

This migration strategy means that rules will be migrated incrementally, and that both non-migrated and migrated rules will coexist for an indeterminate amount of time. Therefore we have to maintain backwards compatibility with non-migrated rules.

The migration logic should take place within the handler logic of all endpoints that carry out write/update endpoint operations, and the endpoint should return the already-migrated rule(s).

Endpoints that perform migration-on-write either fetch the rule before updating it, or send the rule's params as part of the body in the request. Therefore, we can apply migraton logic to them -as described below- before saving the rules to Elasticsearch.

### Technical implementation of migration-on-write

The migration-on-write process implements two changes:

- creates the `ruleSource` field in the SO in Elasticsearch.
- deletes the `immutable` field in the SO in Elasticsearch (although this field is maintained in the API and calculated via normalization-on-read)

The logic for the migration of the rule saved objects might differ depending on the action being performed by the user.

Let's see all possible use cases that will require migration-on-write, the endpoints that they apply to, and the expected resulting migrated field, based on the action and their input.

#### Updating and upgrading rules

Updating rules can currently be performed via five endpoints:

- **Update Rule** - `PUT /rules`
- **Patch Rule** - `PATCH /rules`
- **Bulk Update Rules** - `PUT /rules/_bulk_update`
- **Bulk Patch Rules** - `PATCH /rules/_bulk_update`
- **Bulk Actions** - `POST /rules/_bulk_action`: with **bulk edit** action

Upgrading prebuilt rules to their newer version is done by two endpoints:

- **(LEGACY) Install Prebuilt Rules And Timelines** - `PUT /rules/prepackaged`
- **Perform Rule Upgrade** - `POST /prebuilt_rules/upgrade/_perform` (Internal)

The legacy endpoint does not allow for customization of fields during the upgrade, but the new rule upgrade customization endpoint does. 

Additionally:

- **Bulk Actions** - `POST /rules/_bulk_action`: with **duplicate** action

will perform migration but does not allow for customization during the duplication process.

So we can analyze the expected outputs of the migration of all these 8 endpoints together.

The resulting values for `immutable` and `rule_source` when calling these endpoints, and the migration being performed in the background, should be as follows:

<table>
  <thead>
    <tr>
      <th>Migration use case</th>
      <th>Current value of <code>rule_source</code> and <code>immutable</code></th>
      <th>Any field diverges <br> from base version after update?</th>
      <th>Results</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Custom rule</b> (not migrated yet)</td>
      <td>
        <pre>
{
  immutable: false,
}
        </pre>
      </td>
      <td>N/A - Doesn't apply for custom rules</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'internal'
  }
}
        </pre>
      </td>
    </tr>
    <tr>
      <td><b>Custom rule</b> (already migrated)</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'internal'
  }
}
        </pre>
      </td>
      <td>N/A - Doesn't apply for custom rules</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'internal'
  }
}
        </pre>
      </td>
    </tr>
    <tr>
      <td><b>Prebuilt rule</b> (not yet migrated, no customizations)</td>
      <td>
        <pre>
{
  immutable: true,
}
        </pre>
      </td>
      <td>No</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: false,
    ...
  }
}
        </pre>
      </td>
    </tr>
    <tr>
      <td><b>Prebuilt rule</b> (not yet migrated, with customizations)</td>
      <td>
        <pre>
{
  immutable: true,
}
        </pre>
      </td>
      <td>Yes</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: true,
    ...
  }
}
        </pre>
      </td>
    </tr>
    <tr>
      <td><b>Prebuilt rule</b> (already migrated, no customizations)</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: false,
    ...
  }
}
        </pre>
      </td>
      <td>No</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: false,
    ...
  }
}
        </pre>
      </td>
    </tr>
    <tr>
      <td><b>Prebuilt rule</b> (already migrated, with customizations)</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: false,
    ...
  }
}
        </pre>
      </td>
      <td>Yes</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: true,
    ...
  }
}
        </pre>
      </td>
    </tr>
    <tr>
      <td><i>Customized</i> <b>Prebuilt rule</b> (already migrated, no customizations after update)</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: true,
    ...
  }
}
        </pre>
      </td>
      <td>No</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: false,
    ...
  }
}
        </pre>
      </td>
    </tr>
    <tr>
      <td>Invalid case: Migrating a migrated non-customized prebuilt rule, with customizations. <br><br> `immutable` should never be false if `ruleSource.type' is 'external'. Migration should correct this inconsistency.</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: false,
    ...
  },
  immutable: false,
}
        </pre>
      </td>
      <td>Yes</td>
      <td>
        <pre>
{
  ruleSource: {
    type: 'external',
    isCustomized: true,
    ...
  },
  immutable: true,
}
        </pre>
      </td>
    </tr>

  </tbody>
</table>

As explained before, all these endpoints suffer from the tightly-coupled logic problem described in the section [`Problem with tightly coupled logic in our endpoints`](#problem-with-tightly-coupled-logic-in-our-endpoints).

We should therefore create new CRUD methods as needed to uncouple them logically and cleanly apply migrations to them.

----

#### Bulk editing rules

The endpoint **Bulk Actions** - `POST /rules/_bulk_action` has the same outputs from the migration logic as the endpoints listed in the above section, so it was included in the scenarios in the table above. 

However, this endpoint has some specific details that should be mentioned.

Firstly, when bulk editing rules, the migration should be carried out for the following use cases:
  - Bulk adding or deleting index patterns
  - Bulk adding or deleting tags
  - Updating rule schedules
  - Adding rules actions

Out of the actions mentioned above, the only use cases that should possibly result in the migration having a result of `rule_source.isCustomized = true` are the first three:
  - Bulk adding or deleting index patterns
  - Bulk adding or deleting tags
  - Updating rule schedules

That means that updating a rule's actions should not be considered a customization of a prebuilt rule.

Secondly, in order to migrate the `is_customized` value for rule edits, we can follow two approaches:

1. Calculate it in the `paramsModifier` callback that is passed to the `rulesClient.bulkEdit` method. This will need to modify the parameters of the callback to take as parameter the whole rule and the operations on the attributes, in order to have access to the values of the rule's field before and after of the edit.
2. Calculate it as part of the `validateMutatedRuleTypeParams` method in `x-pack/platform/plugins/shared/alerting/server/lib/validate_mutated_rule_type_params.ts` where we have access to the original params and the modified params.

----

## Endpoints and utilities that will need to be adapted to the new schema

### Utilities

#### KQL filters and the `convertRulesFilterToKQL` method

Across our application, both in the frontend and serverside, we use KQL filters to retrieve rules based on whether they are prebuilt rules or not - this means that the current behaviour of these values relies on the `immutable` field being set to either `true` or `false`.

As mentioned before, we need to assume that at any point in time, there will be a mixture of rules whose saved object has already been migrated on Elasticsearch and others will not. This means that the retrieval of rules will need to maintain backwards compatibility: in order to determine if a rule is prebuilt, preferentially search for the existence of the `rule_source` field and check its `type` subfield; if that doesn't exist, we should fall back to the legacy logic of checking a rule's `immutable` value.

This means that we will need to update the constants and KQL filters that we have hardcoded in our application to reflect the new schema:

_See source of rule params keys: [x-pack/solutions/security/plugins/security_solution/common/detection_engine/rule_management/rule_fields.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/detection_engine/rule_management/rule_fields.ts)_

Will need to update the `x-pack/solutions/security/plugins/security_solution/common/detection_engine/rule_management/rule_filtering.ts` file, where the `convertRulesFilterToKQL` method is defined. This method is used both in the frontend and in the serverside, and translates rule filter options to KQL filters that Elasticsearch can understand.

Here, we need to update the KQL filters and the logic for fetching Elastic prebuilt and custom rules, relying on `rule_source` but with fallback to `immutable`:

_Source for `convertRulesFilterToKQL`: [x-pack/solutions/security/plugins/security_solution/common/detection_engine/rule_management/rule_filtering.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/detection_engine/rule_management/rule_filtering.ts)_

In order to retrieve Elastic prebuilt rules, we can filter for rules in which `alert.attributes.params.rule_source.type` is `external`, with a fallback to rules in which `alert.attributes.params.immutable` is `true`, for rules which have not had their schema migrated and `rule_source` does not still exists for them.

> In the future, we can further distinguish between `type: external` rules by their source origin. If we introduce a new field within `rule_source` that defines their origin (such as `repo_name`, `repo_id`, or similar), we can further filter by Elastic prebuilt rules, or rules that are externally sourced from a repository handled by the user, etc.

### Rule Management endpoints

- **Create Rules** - `POST /rules` and **Bulk Create Rules** - `POST /rules/_bulk_create`:

Currently, we don't support the `immutable` field in any of the endpoints' request parameters (except for the Import endpoint). We shouldn't support the `rule_source` field either, because this value should be controlled by the app on the server side, and not by users.

This is so because we will never want users to be able to create their own prebuilt rules, only install them, import them, and customize them. Also, a prebuilt rule should always be able to be compared to a `security-rule` asset distributed by Fleet, and receive updates from it, which would not be possible if a user creates its own prebuilt rules.

Again, as mentioned in the [`Problem with tightly coupled logic in our endpoints`](#problem-with-tightly-coupled-logic-in-our-endpoints) section, the `createRules` CRUD method used in these two endpoints is re-used in other unrelated use cases, like upgrading rules and importing rules. 

Creating new methods for those unrelated actions should help clean the `createRules` method's interface and logic, and make sure it is only used in these two endpoints.

- **Rule Management Filters** - `GET /rules/_rule_management_filters` (Internal):

This endpoint currently depends on rules `alert.attributes.params.immutable` to fetch number of custom rules and number of prebuilt rules. We need to adapt its logic to rely on new `alert.attributes.params.rule_source` field, with fallback to the original, for backwards compatibility.

Specifically, the endpoint handler uses the [`findRules` utility](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/search/find_rules.ts) to fetch rules based on their `immutable` param.

This needs to be changed so that we rely on the `rule_source.type` param, but fallback to `immutable` if that parameter doesn't exist - i.e., in the case of non-migrated-on-write rules. We need to modify the KQL queries in a similar way to the already described in the section `KQL filters and the convertRulesFilterToKQL`.

We need to modify the `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/api/rules/filters/route.ts` file; specifically the `fetchRulesCount` function, which contains the KQL query filters that should be updated.

_See Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/api/rules/filters/route.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/api/rules/filters/route.ts)_

- **Coverage Overview** - `/rules_coverage_overview` (Internal): This endpoint is called to retrieve the data that populates the MITRE Coverage Overview table, and currently depends on the `immutable` field to fetch the user's installed rules.

Similarly to what was described in the previous endpoint, we should update the logic so that we rely on the `rule_source.type` field, but fallback to `immutable` if that parameter doesn't exist - i.e., in the case of non-migrated-on-write rules.

This endpoint handler also uses the [`findRules` utility](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/search/find_rules.ts) to fetch rules, but the KQL filter that is passed to that utility is created by the reusable [`convertRulesFilterToKQL` utility function](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/common/detection_engine/rule_management/rule_filtering.ts):

_See Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/api/rules/coverage_overview/handle_coverage_overview_request.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/api/rules/coverage_overview/handle_coverage_overview_request.ts)_

Therefor, it is enough to modify the `convertRulesFilterToKQL` utility logic as was described in the section above: [KQL filters and the `convertRulesFilterToKQL` method](#kql-filters-and-the-convertrulesfiltertokql-method)

### Prebuilt Rules endpoints

- [**(LEGACY) Get Prebuilt Rules and Timeline Status** - `/rules/prepackaged/_status`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route.ts)

This currently depends on rules `alert.attributes.params.immutable` to fetch the number of custom rules and number of prebuilt rules. We need to adapt these filters used in the `findRules` method used in the endpoint handler to rely on new `alert.attributes.params.rule_source.type` field, with fallback to the original, for backwards compatibility:

_See Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route.ts)_

As explained above, this endpoint fetches the installed prebuilt rules, as well, using the `getExistingPrepackagedRules` reusable utility. This function needs to be modified as well to update its KQL query filters:

_See source for `getExistingPrepackagedRules`: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/search/get_existing_prepackaged_rules.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/search/get_existing_prepackaged_rules.ts)_

- [**Get Prebuilt Rules Status** - `GET /prebuilt_rules/status` (Internal)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/get_prebuilt_rules_status/get_prebuilt_rules_status_route.ts)

Uses `IPrebuiltRuleObjectsClient` to retrieve instances of prebuilt rules according to the `immutable` field. The Prebuilt Rule Objects client fetches prebuilt rules using the `getExistingPrepackagedRules` function mentioned above, so modifying it as described above will suffice:
_Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client.ts)_

- [**(LEGACY) Install Prebuilt Rules And Timelines** - `PUT /rules/prepackaged`](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route.ts)

This endpoint fetches the installed prebuilt rules using the `getExistingPrepackagedRules` reusable utility, as well:

_Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route.ts)_

Therefore, modifying the `getExistingPrepackagedRules` function as described above will suffice.

- **Installation and Upgrade `_review` and `_perform` endpoints:**

All four endpoints use the Prebuilt Rule Saved Objects client (`IPrebuiltRuleObjectsClient`) to retrieve instances of prebuilt rules according to the `immutable` field. This needs to be modified as described in the **Get Prebuilt Rules Status** - `GET /prebuilt_rules/status` section above.

Additionally:

- [**Review Rule Installation** - `POST /prebuilt_rules/installation/_review` (Internal)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/review_rule_installation/review_rule_installation_route.ts)

This endpoint uses the `convertPrebuiltRuleAssetToRuleResponse` method, which takes in a prebuilt rule asset and converts it to an object of type `RuleResponse`. This method has to be modified so that new prebuilt rules objects are returned by the endpoint with a `rule_source` field of type `external` and its other corresponding subfields, as well as the legacy `immutable` value of `true`.

_Source: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/normalization/rule_converters.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/normalization/rule_converters.ts)_

```ts
// [... file continues above ...]

export const convertPrebuiltRuleAssetToRuleResponse = (
  prebuiltRuleAsset: PrebuiltRuleAsset
): RuleResponse => {
  const prebuiltRuleAssetDefaults = {
    enabled: false,
    // [... other prebuilt rule asset defaults ...]
  };

  const ruleResponseSpecificFields = {
    // [... other prebuilt rule fields ...]
    immutable: true,
    rule_source: {
      type: 'external',
      isCustomized: false,
      sourceUpdatedAt: prebuiltRuleAsset.sourceUpdatedAt,
    },
    revision: 1,
  };

  return RuleResponse.parse({
    ...prebuiltRuleAssetDefaults,
    ...prebuiltRuleAsset,
    ...ruleResponseSpecificFields,
  });
};
```

- [**Perform Rule Installation** - `POST /prebuilt_rules/installation/_install` (Internal)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/perform_rule_installation/perform_rule_installation_route.ts)

To install a new prebuilt rule, this endpoint uses the [`createPrebuiltRules` method](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules.ts), which in turn calls the [`createRules` method](https://github.com/elastic/kibana/blob/8.0/x-pack/plugins/security_solution/server/lib/detection_engine/rules/create_rules.ts).

This endpoint also suffers from the issue of tightly coupled logic explained above: using th `createRules` method for creating, importing and upgrading -in some cases- rules. We need to create a new CRUD method specifically for installing prebuilt rules, that extracts that responsibility out of the `createRules` method.

- [**Review Rule Upgrade** - `POST /prebuilt_rules/upgrade/_review` (Internal)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/review_rule_upgrade/review_rule_upgrade_route.ts)

This endpoint uses the `convertPrebuiltRuleAssetToRuleResponse` method to get a `RuleResponse`-type object from a target version of a rule provided from upstream. This method needs to be modified as described in the section that details the changes needed for the **Review Rule Installation** - `POST /prebuilt_rules/installation/_review`.

This endpoint will need further changes, which will be detailed further down, and are out of the scope of Saved Object, migration and rule schema updates.

- [**Perform Rule Upgrade** - `POST /prebuilt_rules/upgrade/_perform` (Internal)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/prebuilt_rules/api/perform_rule_upgrade/perform_rule_upgrade_route.ts)

This endpoint will require major changes to add the capability of letting users selecting a custom version of the rule with custom values for rule fields. This will be explained further below in the "Changes to upgrade `_review` and `_perform` endpoints" section.

The calculation of the value for the `rule_source.is_customized` field for the updated rule will depend on that logic as well, so its calculation will be explained in that section.

Again, this endpoint suffers from tightly coupled logic explained in [`Problem with tightly coupled logic in our endpoints`](#problem-with-tightly-coupled-logic-in-our-endpoints): it uses the `upgradePrebuiltRules` method to actually upgrade the rules, but this method either patches existing rules -for the normal case-, or deletes an existing rule and recreates it if the rule underwent a type change, using the `patchRules` and `createRules` methods respectively. We should decouple that logic by introducing a new CRUD method with a specific use case for upgrading prebuilt rule.

### Rule monitoring endpoints

- [**Detection Engine Health: Get Cluster Health** - `GET or POST /detection_engine/health/_cluster` (internal):](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/api/detection_engine_health/get_cluster_health/get_cluster_health_route.ts)

This endpoint uses the [Detection Engine Health Client (`IDetectionEngineHealthClient`)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/detection_engine_health_client_interface.ts), calling its [`calculateClusterHealth` method](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/detection_engine_health_client.ts) in the request handler.

The Detection Engine Health client receives as its parameter the [Rule Objects Health client (`IRuleObjectsHealthClient`)](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/rule_objects/rule_objects_health_client.ts), whose method `calculateClusterHealth` performs an aggregation on rule stats based on different rule attributes and parameters.

This is done in the [`getRuleStatsAggregation` method](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/rule_objects/aggregations/rule_stats.ts), where an aggregation is done over the `immutable` param. This needs to be updated to the new `rule_source.type` param, with a fallback to `immutable`:

_Source: x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/rule_objects/aggregations/rule_stats.ts(https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/rule_objects/aggregations/rule_stats.ts)_

- **Detection Engine Health: Get Space Health** - `GET or POST /detection_engine/health/_space` (internal):

In this endpoint, the `getSpaceHealthAggregation` method of the Rule Objects Health client (`IRuleObjectsHealthClient`) is called instead, but it internally calls the same [`getRuleStatsAggregation` method](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_monitoring/logic/detection_engine_health/rule_objects/aggregations/rule_stats.ts) as in the previous endpoint.

Therefore, the update described in the endpoint above would cover this endpoint too.

- **Detection Engine Health: Get Rule Health** - `POST /detection_engine/health/_rule` (internal):

This endpoint does not depend on any of the affected params, i.e. no changes are needed here.

### Rule Execution Logs

Rule execution logging works independently of whether the rules are prebuilt or not, so any changes to the rule schema won't affect these endpoints.

## Exporting and importing rules

**Current behaviour:**

- Custom Rules can be exported and imported
- When trying to import a custom rule, if the request payload doesn't include an `overwrite: true` value, its `rule_id` should not already exist in any of the installed rules. Otherwise the import logic will fail : `rule_id: {rule_id} already exists`. If the request payload includes an `overwrite: true`, the rule will be overwritten.
- Prebuilt Rules cannot be exported
- Prebuilt Rules cannot be imported (if you try to import a rule that has been set the `immutable` field to `true` manually, the import endpoint will reject it as the `immutable` field is expected to be `false`)

**Updated behaviour**

We will now allow the user to export and import both **prebuilt** and **custom rules**.

### Exporting rules

The user will now be able to export both custom and prebuilt rules (including any customizations that might have been performed on its modifiable fields).

The export endpoints (bulk export and bulk action in export mode) will not carry out any migration-on-write logic. Since these endpoints solely read the rules and generate an ndjson file for export purposes, introducing additional writing or patching logic to migrate the rule's schema in Elasticsearch would negatively impact the endpoints' performance and introduce unnecessary overhead.

Instead, we will carry out a normalization-on-read process, as described above, when the rule to be exported is read from ES, and before writing the rule's fields to the `ndjson` file. This means that the rule will actually be exported with the updated schema.

This normalization will take place within the `internalRuleToAPIResponse` method, which internally calls the `normalizeRuleSourceSchemaOnRuleRead`, as described in the [Normalization on read](#normalization-on-read) section.

There are two helper functions used for exporting:

- [getExportByObjectIds](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/export/get_export_by_object_ids.ts)
- [getExportAll](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/export/get_export_all.ts)

The **Export Rules** - `POST /rules/_export` endpoint uses either the first or the second helper depending on the request payload, while **Bulk Actions** - `POST /rules/_bulk_action` uses only `getExportByObjectIds`.

Both of these methods use `internalRuleToAPIResponse` internally to transform rules into our API response schema, so the normalization will come out of the box when executing that transformation.

Also, in order to allow the endpoint to export both custom **and** prebuilt rules, we need to update the logic and remove the checks that we currently do server-side in both of these methods, and which filter out prebuilt rules from the response payload:

_Source for `getRulesFromObjects`: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/export/get_export_by_object_ids.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/export/get_export_by_object_ids.ts)_


_Source for `getExportAll`: [x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/export/get_export_all.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_management/logic/export/get_export_all.ts)_

### Importing rules

The user will now be able to import both custom and prebuilt rules (including any customizations that might have been performed on its modifiable fields).

We want to handle the case of importing both migrated and non-migrated rules via an `ndjson` file.

If a user imports a prebuilt rule, Kibana should continue to track the rule asset from the `security_detection_engine` package if the `rule_id` matches. This means that a user will be able to upgrade a previously imported prebuilt rule, visualize any diffs on any customized fields, and continue to receive updates on the rule. 

To allow for importing of Elastic prebuilt rules, we will **not rely** in the `rule_source` or the legacy `immutable` fields (which are not part of the import endpoint parameters), but we will rather **calculate them dynamically based on the `rule_id` and `version` request parameters**.

The logic to importing a rule is as follows:

 - First, read the import endpoint request parameters `rule_id` and `version`. These two are two required parameters in the endpoint.

- Secondly, check that the `security_detection_engine` Fleet package is installed and install it if it isn't. We will need the package to be installed to check if a rule that is being imported is an Elastic prebuilt rule.

- Then, using the `rule_id` and `version`, attempt to fetch the corresponding `security-rule` asset from ES. 

- **If a matching `rule_id` and `version` is found**, that means that the rule is an Elastic prebuilt rule, and we should therefore dynamically calculate the rule's `rule_source` field and its subfields:
  - `type`: should be always `external` since a matching external `security-rule` was found.
  - `source_updated_at`: can be retrieved from the corresponding `security-rule` asset.
  - `is_customized`: should be calculated based on the differences between the `security-rule` asset's fields and the rule fields from the import request. If any of them are different, i.e. have diverged from the base version, `is_customized` should be true. 

- Finally, using the import payload, plus the rule's `security-rule` asset fields and the calculated `rule_source` fields, create the rule, or update it if already exists in Kibana.

**If a matching `rule_id` is found, but the `version` is not found**, it means there are some versions of this prebuilt rule known to Kibana, which means we should identify the rule being imported as prebuilt. The prebuilt rules package has a limit on the number of historical rule versions, and we can't assume that for a given rule_id we will always have ALL historical versions available as security-rule assets.

In this case, we will set the rule's params to be:
```
{ 
  ruleSource: {
    type: 'external',
    isCustomized: false
  }
}
```


**If a matching `rule_id` is NOT found**, that means that the rule is a custom rule. And `rule_source` will be simply:
```
{
  type: 'internal'
}
```

And we can finally create a rule or update an existing rule using the request payload and the calculated `rule_source` field.

Given the requirements described above, the following table shows the behaviour of our endpoint for a combination of inputs and Kibana states.

(All situation assume that the Elastic prebuilt rules package will be installed, since we have set this as a precondition of the endpoint)

<table>
  <thead>
    <tr>
      <th>Current state of rule<br>(match by rule_id)</th>
      <th>Matching rule_id found as security-rule asset?</th>
      <th>Matching version found for security-rule asset?</th>
      <th>Example field in import payload</th>
      <th>Overwrite existing rule?</th>
      <th>Output</th>
    </tr>
  </thead>
  <tbody>
  <tr>
    <td>Not installed</td>
    <td>No</td>
    <td>N/A</td>
    <td>
<pre>
{
  name: "My custom rule",
} 
</pre>
    </td>
    <td>N/A</td>
    <td>
<pre>
{
  name: "My custom rule",
  rule_source: {
    type: "internal"
  }
} 
</pre>
      </td>
    </tr>
  <tr>
    <td>
<pre>
{
  name: "My custom rule",
} 
</pre>
    </td>
    <td>No</td>
    <td>N/A</td>
    <td>
<pre>
{
  name: "My edited rule",
} 
</pre>
    </td>
    <td>
      <b>No</b>
    </td>
    <td>
      Rule import rejected<br> because of rule_id match
    </td>
    <tr>


  <tr>
    <td>
<pre>
{
  name: "My custom rule",
} 
</pre>
    </td>
    <td>No</td>
    <td>N/A</td>
    <td>
<pre>
{
  name: "My edited rule",
} 
</pre>
    </td>
    <td>
      Yes
    </td>
    <td>
<pre>
{
  name: "My edited rule",
  ruleSource: {
    type: "internal"
  }
} 
</pre>
      </td>
    <tr>
  <tr>
    <td>
      Not installed
    </td>
    <td>
<pre>
{
  name: "My prebuilt rule",
  source_updated_at: "2024-05-..."
} 
</pre>
    </td>
    <td><b>No</b></td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>N/A</td>
    <td><pre>
{
  name: "My prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: false,
  }
} 
</pre>
      </td>
    <tr>
  <tr>
    <td>
      Not installed
    </td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>Yes</td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>N/A</td>
    <td>
<pre>
{
  name: "My prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: false,
  }
} 
</pre>
      </td>
    <tr>
  <tr>
    <td>
      Not installed
    </td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>Yes</td>
    <td>
<pre>
{
  name: "My custom prebuilt rule",
} 
</pre>
    </td>
    <td>N/A</td>
    <td>
<pre>
{
  name: "My custom prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: true,
  }
} 
</pre>
      </td>
    <tr>
  <tr>
    <td>
<pre>
{
  name: "My prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: false,
  }
} 
</pre>
    </td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>Yes</td>
    <td>
<pre>
{
  name: "My custom prebuilt rule",
} 
</pre>
    </td>
    <td><b>No</b></td>
    <td>
    Rule import rejected<br> because of rule_id match and overwrite flag is false
      </td>
    <tr>
  <tr>
    <td>
<pre>
{
  name: "My prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: false,
  }
} 
</pre>
    </td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>Yes</td>
    <td>
<pre>
{
  name: "My custom prebuilt rule",
} 
</pre>
    </td>
    <td>Yes</td>
    <td>
<pre>
{
  name: "My custom prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: true,
  }
} 
</pre>
      </td>
    <tr>
  <tr>
    <td>
<pre>
{
  name: "My custom prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: true,
  }
} 
</pre>
    </td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>Yes</td>
    <td>
<pre>
{
  name: "My prebuilt rule",
} 
</pre>
    </td>
    <td>Yes</td>
    <td>
<pre>
{
  name: "My prebuilt rule",
  ruleSource: {
    type: "external",
    isCustomized: false,
  }
} 
</pre>
      </td>
    <tr>
  </tbody>
</table>


### Handling the `version` parameter

In the code above, we made an additional check: if the rule to be imported is a prebuilt rule, then the `version` field will be required as part of the payload as well. Attempting to import a prebuilt rule without it will result in an error and the importing of that rule will be skipped. The `version` is necessary to be able to provide updates to the rule when a new version is available in the Prebuilt Rules package. Without it we don't know if the installed version is newer or older than the update being offered by the package.

Since users will be importing rules via an `ndjson` file, they can potentially modify it as they please. If the `version` field of a prebuilt rule is changed by the user before importing, the update workflow could be broken. The possible scenarios are the following:

**1. The user removes the `version` field from the importing payload:** as mentioned above, we won't be able to start the upgrading flow because we don't have a version number to compare to the version coming from the update. Therefore, we should **reject the import if the `version` is missing**.

**2. The user lowers the `version` field in the importing payload:** for example, a user exports a prebuilt rule with `version: 5`, and, before importing it, modifies it to `version: 4`. This wouldn't represent a problem as a new version of the rule (i.e. `version: 6`) would still trigger the update workflow, and the rule field diffs would still work as expected.

**3. The user increases the `version` field in the importing payload:** for example, a user exports a prebuilt rule with `version: 5`, and before importing it modifies it to `version: 6`. This would mean that when the actual rule with `version: 6` was released, we wouldn't trigger the update workflow, since the version from the target version (the update) needs to be higher than what is currently installed for that to happen. However, the update would eventually be triggered when the next update was released, i.e. when `version: 7` is released, and work as expected.

**4. The user sets the `version` field from the importing payload to a number that does not exist in the Prebuilt Rules package**: this scenario would still depend on whether the `version` that the user modifies the rule to is higher or lower than the version of the update:

- If it was higher, then we would be back in **scenario 3**, where the update workflow wouldn't trigger.
- If it was lower, then we would be in **scenario 2**, but with the additional problem that we wouldn't be able to fetch the **base** version of the rule - the unmodified version of the rule as it exists in the Prebuilt Rules package. However, we would still be able to normally display the rule field diffs between the current rule and the target (next version) rule (which is the default behaviour), but not between the base and the target (which is a feature that we want to a add as part of this Milestone).

$\space$


## Customizing Prebuilt Rules

### Endpoints

With the rule schema updated, we will allow users to **edit their prebuilt rules** in a similar way to how they currently edit/modify their custom rules. A full detail of which fields we will allow the users to edit can be found in the section "Rule fields" below.

Endpoints that users will be able to use to modify rules are:

- **Update Rule** - `PUT /rules`: called by the UI when updating/modifying a single rule via the Rule Editing page
- **Patch Rule** - `PATCH /rules`: used for attaching shared exceptions list to rules
- **Bulk Patch Rules** - `PATCH /rules/_bulk_update`: deprecated and unused by the UI (might still be used by public API users)
- **Bulk Update Rules** - `PUT /rules/_bulk_update`: deprecated and unused by the UI (might still be used by public API users)
- **Bulk Actions** - `POST /rules/_bulk_action` - with `edit` action: called when applying bulk actions via the Rules Table

The first four endpoints listed above **currently allow users to modify their Elastic prebuilt rules** as well, in (almost) all of their fields, and no difference is made between updating/patching prebuilt rules and custom rules in the docs. However, none of those four endpoints allow to change a prebuilt rule to a custom rule (or vice-versa) by changing the current `immutable` field (i.e. the field is maintained from the existing rule).

> - **Will we want to allow users to modify (via API) a prebuilt rule to transform it into a Custom Rule, by modifying the `rule_source` parameter?**
>   - No. We want to keep the current endpoint logic, where the `immutable` field for the updated value comes from the existing value of the rule and is not modifiable. Allowing that modification would create issues with the corresponding `security_detection_engine` package rule, as it will clash with the modified rule if the `rule_id` is not modified as well. This requirement is therefore not needed anyway since will now offer users the option to customize a prebuilt rule, or alternatively, duplicate a prebuilt rule.

The endpoint **Bulk Actions** - `POST /rules/_bulk_action` does provide validation in the endpoint logic itself: if a user attempts to edit prebuilt rule (`immutable: true`) the endpoint rejects that edit in two ways:

- in `dryRun` mode, with an error: "editing prebuilt rules is not supported".
- in normal mode, with validation that throws the error "Elastic rule can't be edited".

In both cases, the validation checks if the `immutable` param of the rule is `false`, or if the action sent in the payload is setting or adding actions to a rule. If any of those two conditions are true, the validation succeeds and the rule(s) can be edited.

#### Changes needed to endpoints

Depending on the endpoint, we will have to modify it to address multiple changes. These are:

1. **Introduction of migration logic**: as explained in the first section of this document, endpoints should have the additional responsibility of migrating our rule schema.
2. **Calculation of the `is_customized` field**: this field which is part of the `rule_source` field for external rules needs to be recalculated whenever a rule's field is possibly modified. See implementation details in the [Updating the `is_customized` field](#updating-the-is_customized-field) section.
3. **Removing checks that block modifying prebuilt rules:** some of our endpoints prevent users from modifying prebuilt rules. This check needs to be removed from all endpoints to allow the customization of prebuilt rules.
4. **Blocking the update of non-customizable fields:** while the goal of this epic is to allow users to modify their prebuilt rule fields, there are certain rule fields that we will still want to prevent the user from modifying via endpoints, since we will not provide support for resolving conflicts for them via the UI or API if they arise during an update. See the **Customizable** column in [this ticket](https://github.com/elastic/kibana/issues/147239) for a detailed list of fields that should be blocked from modification via the endpoints.

The table below shows which of these changes need to be applied to our endpoints: (
  
- ✏️ Changes needed
- ➖ No changes needed

  <table>
    <thead>
      <tr>
        <th>Endpoints</th>
        <th>Migration logic</th>
        <th>is_customized calculation</th>
        <th>Removing prebuilt checks</th>
        <th>Blocking non-customizable fields updates</th>
      </tr>
    </thead>
    <tbody align="center">
      <tr>
        <td><b>Update Rule</b> - PUT /rules</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>➖</td>
        <td>✏️</td>
      </tr>
      <tr>
        <td><b>Patch Rule</b> - PATCH /rules</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>➖</td>
        <td>✏️</td>
      </tr>
      <tr>
        <td><b>Bulk Patch Rules</b> - PATCH /rules/_bulk_update</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>➖</td>
        <td>✏️</td>
      </tr>
      <tr>
        <td><b>Bulk Update Rules</b> - PUT /rules/_bulk_update</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>➖</td>
        <td>✏️</td>
      </tr>
      <tr>
        <td><b>Bulk Actions</b> - POST /rules/_bulk_action</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>➖</td>
      </tr>
      <tr>
        <td><b>Perform Rule Upgrade</b> - POST /prebuilt_rules/upgrade/_perform</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>➖</td>
        <td>➖</td>
      </tr>
      <tr>
        <td><b>Import Rules</b> POST /rules/_import</td>
        <td>✏️</td>
        <td>✏️</td>
        <td>➖</td>
        <td>✏️</td>
      </tr>
  </table>

#### Updating the `is_customized` field

The `is_customized` field is initialized to a value of `false` for any new prebuilt rule that is installed, as well as in prebuilt rules that are migrated from the legacy schema.

For all of the endpoints that allow for modifying a prebuilt rule, the five endpoints mentioned in the last section, we will want to calculate if: when the modifications are applied to the current state of the rule, does the rule result in a customized version of the prebuilt rule?

This means, specifically: **do any of the rule's resulting fields differ from the base version of the rule?**

In order to determine this, each time a user attempts to customize a prebuilt rule, we will need to pull its corresponding version of the `security-rule` asset, and compare the end result of the customization with the assets field's. If any of them are different, the `rule_source.is_customized` field should be set to `true`. Otherwise, it should be set to `false`.

Notice that this can therefore result in a two-way operation: a prebuilt rule that is non-customized can end up as being customized (`is_customized: true`), while a rule that is customized at the beggining of the operation can result in a non-customized rule after the modification (if the changes made by the user make the rule match its base version).

The rule's fields that should be taken into account to determine if the rule has been customized are any of the fields in `BaseRequiredFields`, `BaseOptionalFields` or `BaseDefaultableFields` from the rule schema with the exception of:

- exceptions
- actions (not part of `security-rule` asset for now anyways)
- `author` and `license` (which shouldn't be customizable anyways)
- `output_index` and `namespace` (deprecated)
- `meta` (to be deprecated)

In the case of exceptions, all type of changes related to rule exceptions should be ignored during the calculation of `is_customized`:

- a new shared exception list is added to the rule
- a shared exception list is removed from the rule
- an exception item is added to the rule's shared exception list
- a default exception list is created for the rule and an exception is added to it
- an exception item is removed from the rule's default exception list

The following use cases should be covered in the calculation of `is_customized`:

<table>
  <thead>
    <tr>
      <th>Use case</th>
      <th>Current state of rule</th>
      <th>security-rule asset</th>
      <th>PUT Endpoint payload</th>
      <th>Output</th>
    </tr>
  </thead>
  <tbody>

  
  <tr>
    <td>Modified field value diverges from base asset</td>
    <td>
<pre>
{
  name: "Original name",
  rule_source: {
    type: "external",
    is_customized: false,
    ...
  }
}
</pre>
    </td>
    <td>
      <pre>
{
  name: "Original name",
}</pre>
    </td>
    <td>
      <pre>
{
  name: "My custom name",
}</pre>
    </td>
    <td>
<pre>
{
  name: "My custom name",
  rule_source: {
    type: "external",
    is_customized: true,
    ...
  }
}
</pre>
    </td>
  </tr>



  
  <tr>
    <td>New field added, not existing in base asset</td>
    <td>
<pre>
{
  name: "Original name",
  rule_source: {
    type: "external",
    is_customized: false,
    ...
  }
}
</pre>
    </td>
    <td>
      <pre>
{
  name: "Original name",
}</pre>
    </td>
    <td>
      <pre>
{
  name: "Original name",
  note: "My investigation guide",
}</pre>
    </td>
    <td>
<pre>
{
  name: "Original name",
  note: "My investigation guide",
  rule_source: {
    type: "external",
    is_customized: true,
    ...
  }
}
</pre>
    </td>
  </tr>






  
  <tr>
    <td>Modified matches value in base asset</td>
    <td>
<pre>
{
  name: "My custom name",
  rule_source: {
    type: "external",
    is_customized: true,
    ...
  }
}
</pre>
    </td>
    <td>
      <pre>
{
  name: "Original name",
}</pre>
    </td>
    <td>
      <pre>
{
  name: "Original name",
}</pre>
    </td>
    <td>
<pre>
{
  name: "Original name",
  rule_source: {
    type: "external",
    is_customized: false,
    ...
  }
}
</pre>
    </td>
  </tr>






  
  <tr>
    <td>Field existing in base asset is removed</td>
    <td>
<pre>
{
  name: "Original name",
  "tags": ["Linux", "Windows"]
  rule_source: {
    type: "external",
    is_customized: false,
    ...
  }
}
</pre>
    </td>
    <td>
      <pre>
{
  name: "Original name",
  "tags": ["Linux", "Windows"]
}
      </pre>
    </td>
    <td>
      <pre>
{
  name: "Original name",
}
      </pre>
    </td>
    <td>
<pre>
{
  name: "Original name",
  rule_source: {
    type: "external",
    is_customized: true,
    ...
  }
}
</pre>
    </td>
  </tr>








  
  <tr>
    <td>Edge case: base asset not found</td>
    <td>
<pre>
{
  name: "Original name",
  rule_source: {
    type: "external",
    is_customized: false,
    ...
  }
}
</pre>
    </td>
    <td>
      <center><b>Not found</b></center>
    </td>
    <td>
      <pre>
{
  name: "Original name",
}</pre>
    </td>
    <td>
<pre>
{
  name: "Original name",
  rule_source: {
    type: "external",
    is_customized: true,
    ...
  }
}
</pre>
    </td>
  </tr>





  </tbody>
  </table>

Notice the last scenario from the table, which deals with the edge case of the corresponding version of the `security-rule` asset not being found. This would prevent from doing a comparison of the fields to calculate if the rule should be considered customized or not.

Scenarios in which this could happen are:

- A user manually deletes package and assets
- A user imports a prebuilt rule with matching `rule_id` but no matching version (base version missing)
- A user imports a prebuilt rule from a newer version of Kibana and the Elastic prebuilt rules package into an older version of Kibana where that `version` of the rule does not exist or hasn't been created yet.

So, if the corresponding rule asset is not found, do not attempt to do any comparisons and mark the rule as `is_customized: true`; ignoring the current values of the rules, the payload and the end result.

Reasons:
- A prebuilt rule which is being modified has a much higher chance of ending up as `is_customized: true` than `false`. Given that we cannot know this for certain, marking it as customized is the best educated guess.
- If we ended up making a wrong assumption in that previous point, it can be corrected the next time the rule is upgraded, or if the rule is modified again and the rule asset is found this time.
- A rule which is missing its base version makes more sense being customized than non-customized from a domain-modelling point of view.
- The alternative of rejecting the update on a simple field name change is just bad UX: a user just wants to change a rule's name and probably doesn't care that the corresponding `security-rule` asset is not installed.

### In the UI

The current behaviour of the app allows to modify a rule's fields in the following ways:

#### Via the Rule Edit Page

The **Rule Edit Page** is currently split into four tabs:

| Tab            | Contains fields|
| -------------- | -------------- |
| **Definition** | - Rule type (cannot be changed)<br>- Data Source<br>- Query<br>- Machine Learning job (ML rules only)<br>- Anomaly score threshold (ML rules only)<br>- Group by (threshold rules only)<br>- Count (cardinality) (threshold rules only)<br>- Indicator index patterns (indicator match rules only)<br>- Indicator index query (indicator match rules only)<br>- Indicator mapping (indicator match rules only)<br>- New terms fields (new term rules only)<br>- History window size (new terms rules only)<br>- Alert Suppression (for custom query and threshold rules only)<br>- Timeline Template |
| **About**      | - Name<br>- Description<br>- Severity<br>- Severity override<br>- Risk score<br>- Risk score override<br>- Tags<br>- Reference URLs<br>- False positive examples<br>- MITRE ATT&CK™ threats<br>- Custom highlighted fields<br>- Investigation guide<br>- Author<br>- License<br>- Elastic Endpoint exceptions<br>- Building block<br>- Rule name override<br>- Timestamp override|
| **Schedule**   | - Interval<br>- Lookback time|
| **Actions**    | - Actions<br>- Response actions (custom query rules only)|

Out of these four tabs, only **Actions** is enabled and accessible when editing a prebuilt rule - since actions (and shared exceptions lists and snoozing) are the only fields that can currently be modified for prebuilt rules from the UI.

All of the fields in the UI, listed above, are currently editable for custom rules, except for rule type, which is read only.

Once done editing the rule, the user clicks on the "Save Changes" button, which calls the **Update Rule** - `PUT /rules` endpoint, passing the payload for the whole rule.

**Expected behaviour for customizing prebuilt rules**

- All four tabs of the Rule Edit page should be enabled, and all the fields within each tab should be editable, as they currently are for custom rules.
- The only fields in the UI that should not be customizable are: **Rule Type**, **Author** and **License**, which should continue to be read-only.
- **Definition** should be the default open tab when opening the edit rule page for a prebuilt rule (current default is **Actions**)
- Field validation should continue to work as it does for custom rules.
- No fields should return a validation error for the values that come from the `security_detection_engine` package with prebuilt rules. This means that a user should be able to successfully save any stock prebuilt rule with no changes.

#### Via the Rule Management page

The existing filter in the Rules table should be updated so that rules can be filtered by:
- custom rules
- non-customized prebuilt rules
- customized prebuilt rules

#### Via Bulk Actions

Custom rules can currently be updated via the Rule Table's **Bulk Actions**, which uses the **Bulk Actions** - `POST /rules/_bulk_action` endpoint.

Apart from enabling/disabling a rule - the only other action that modifies a rule's saved object and is currently possible for prebuilt rules - the user can use bulk actions to:

- Add, delete and overwrite **index patterns**
- Add, delete and overwrite **tags**
- Add and overwrite **rule actions**
- Update the rule's **schedule: interval and lookback time**
- Select a **timeline template** for the rule

As explained above, the UI validates that the five actions listed above are only possible to custom rules by using the `dryRun` mode of the **bulk actions** endpoint. If any of the selected rules in the request payload is a prebuilt rule, a message is displayed to the user informing them that modifying prebuilt rules is not possible, and that rule is removed from the subsequent request that is made in normal mode to actually edit the rule.

**Expected behaviour for customizing prebuilt rules**

- The Bulk Actions UI should now allow users to edit prebuilt rules.
- All bulk actions listed above should now be applicable to prebuilt rules (This means that the changes in the API for the validation done in `dryRun` mode should not remove the rules from the payload anymore).

> The `dryRun` mode request will still be necessary since we perform other checks that can still prevent prebuilt rules from being edited. For example, Machine Learning and ES|QL rules cannot be bulk edited to add or delete index patterns, since they don't have that field in their schema.

#### Via the Rules Details Page

The Rules Details page allows the user to modify the rule in two ways:

- enable/disabling
  - uses `POST /rules/_bulk_action` endpoint with enable/disable action
- setting rule snoozing
  - uses `POST /alerting/rule/{rule_id}/_snooze` endpoint

Both of these actions are already possible for prebuilt rules.

- The Rule Details page should include a text field that lets the user know if the current rules is **custom**, **Elastic prebuilt** and **customized Elastic prebuilt**.

#### Via the Shared Exception Lists page

The Shared Exception Lists page allows a user to create shared exception lists and then attach them to (or remove them from) a user's security rules.

This page calls the **Patch Rule** - `PATCH /rules` endpoint to modify only the `exceptions_list` field of a rule saved object. Since a user can append an exception list to multiple rules via the UI, the endpoint is called multiple times simultaneously, one for each rule that is attached to or removed from.

There is no validation regarding prebuilt rules in the UI for this use case: both the endpoint and the application currently allow the user to attach exceptions lists to both custom and prebuilt rules.

This means that **no changes will be needed in this page.**

#### Via the Stack Management > Rules UI

The Stack Management Rules UI provides a unified view across the Elastic stack, showing not only security rules, but also other types such as observability, ML, etc.

All rules listed here can be modified in the following ways:

- enabling and disabling
- snoozing/unsnoozing or scheduling/unscheduling snooze
- updating their API keys
- deleting them

All of these actions are currently applicable for both prebuilt security rules as well as custom security rules, and they use the Alerting Framework endpoints of:

- `POST /alerting/rules/_bulk_edit`
- `PATCH /alerting/rules/_bulk_delete`

This means that **no changes will be needed in this page.**

## Design Discussion link

For an up-to-date discussion on the design changes needed for Milestone 3, please see [this ticket](https://github.com/elastic/kibana/issues/178211).


## Upgrading Prebuilt Rules

### Changes to `/upgrade/_perform` endpoint

The endpoint's currently implemented contract needs to be updated as described in this [PoC](https://github.com/elastic/kibana/pull/144060).

### Changes to `/upgrade/_review` endpoint

The endpoint currently implemented contract needs to be updated as described in this [PoC](https://github.com/elastic/kibana/pull/144060).

### Concrete field diff algorithms by type

The algorithm used in the `/upgrade/_review` endpoint for calculating rule version diffs' core structure is [fully implemented](https://github.com/elastic/kibana/pull/148392) and operational. However, the current method for calculating field differences is basic: it currently simply compares field values across versions and flags a conflict if the base version, the current version and the target versions differ from one another. In this conflict scenario, the `mergedVersion` of the field proposed by the algorithm always equals the `targetVersion`.

We propose developing more adaptable diff algorithms tailored to specific rule fields or rule field types. These more specific algorithms aim to minimize conflicts and automate merging of changes, doing the best effort to keep the intended customizations applied by the user, as well as the updates proposed by Elastic. Hopefully, the user will be able to simply review the proposal and accept it.

In general, for all types of fields, we will follow the heuristic:

- if `target` === `base` && `current` !== `base`, we set merge proposal to be the current version, without a conflict
- if `current` === `base` && `target` !== `base`, we set merge proposal to be the target version, without a conflict
- if `base` !== `current` !== `target`: mark the diff as a conflict AND:
  - **if conflict is non-solvable**: use the `current` version as the merge proposal 
  - **if conflict is solvable** use the generated merged version as the merge proposal (possible only in a few types, detailed below - see tables)

Depending on the specific field or type of field we might want to apply a specific merging algorithm when conflicts arise. Let's propose different types.

#### Single-line string fields

> Examples: `name`, `query`

For single-line string fields we will continue to use the existing simple diff algorithm, with all non-solvable scenarios in case of conflict, because:
- Merging keywords (especially enums) should never be done, because it could generate an invalid value.
- Changes to a rule's name might indicate some semantical changes to the whole rule (e.g. related to its source data, query/filters logic, etc). So, if both Elastic and user changed the name of the same rule, this could be an indication that the two versions of these rule are not compatible with each other, and the changes need to be reviewed by the user. Generating a conflict in this case would help the user to pay attention to all the changes.

<table>
  <thead>
    <tr>
      <th style="border-right:3px solid black">Use case</th>
      <th>Base version</th>
      <th>Current version</th>
      <th style="border-right:3px solid black">Target version</th>
      <th>Merged version (output)</th>
      <th>Conflict</th>
    </tr>
  </thead>
  <tbody align="center">
    <tr>
      <td style="border-right:3px solid black">No customization, no updates (AAA)</td>
      <td><code>My rule name</code></td>
      <td><code>My rule name</code></td>
      <td style="border-right:3px solid black"><code>My rule name</code></td>
      <td><code>My rule name</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">User customization, no updates (ABA)</td>
      <td><code>My rule name</code></td>
      <td><code>My CUSTOM rule name</code></td>
      <td style="border-right:3px solid black"><code>My rule name</code></td>
      <td><code>My CUSTOM rule name</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">No customization, upstream update (AAB)</td>
      <td><code>My rule name</code></td>
      <td><code>My rule name</code></td>
      <td style="border-right:3px solid black"><code>My UPDATED rule name</code></td>
      <td><code>My UPDATED rule name</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update match (ABB)</td>
      <td><code>My rule name</code></td>
      <td><code>My GREAT rule name</code></td>
      <td style="border-right:3px solid black"><code>My GREAT rule name</code></td>
      <td><code>My GREAT rule name</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update conflict (ABC)</td>
      <td><code>My rule name</code></td>
      <td><code>My GREAT rule name</code></td>
      <td style="border-right:3px solid black"><code>My EXCELLENT rule name</code></td>
      <td><code>My GREAT rule name</code></td>
      <td><code>NON_SOLVABLE</code></td>
    </tr>
  </tbody>
</table>


#### Multi-line string fields

> Examples: `description`, `setup`, `note` (Investigation guide)

For multi-line string fields, in case of scenarios where the `base`, `current` and `target` versions are different, the scenario is marked as conflict. 
However, in some cases the merged proposal can be successfully calculated and solved, while in other cases not.

These two types of scenarios are found in the last two rows of the table, but let's see an example of each in detail:

**Solvable conflict**
**BASE:** 
```
My description.
This is a second line.
```
**CURRENT**
```
My GREAT description.
This is a second line.
```
**TARGET**
```
My description.
This is a second line, now longer.
```

Using a diffing library such as `nodeDiff3`, we can attempt to create a merge proposal out of the 3 versions:
```ts
const nodeDiff3 = require("node-diff3");
const base = "My description. \nThis is a second line.";
const current = "My GREAT description. \nThis is a second line.";
const target = "My description. \nThis is a second line, now longer.";

const nodeDiff3.diff3Merge(current, base, target) // Order is not a typo, that's how the library works

// OUTPUTS:
// [
//   {
//     ok: [
//       'My',           'GREAT',
//       'description.', 'This',
//       'is',           'a',
//       'second',       'line,',
//       'now',          'longer.'
//     ]
//   }
// ]
```
The library is able to solve the changes of the two sentences individually and produces an acceptable merge proposal. We should still mark it as a conflict to drive the user's attention to the result and allow them to decide if it makes sense or not.

**Non-Solvable conflict**
**BASE:** 
```
My description.
This is a second line.
```
**CURRENT**
```
My GREAT description.
This is a third line.
```
**TARGET**
```
My EXCELLENT description.
This is a fourth.
```

```ts
const base = "My description. \nThis is a second line.";
const current = "My GREAT description. \nThis is a third line.";
const target = "My EXCELLENT description. \nThis is a fourth line.";

nodeDiff3.diff3Merge(current, base, target);

// OUTPUTS:
// [
//   { ok: [ 'My' ] },
//   {
//     conflict: { a: [Array], aIndex: 1, o: [], oIndex: 1, b: [Array], bIndex: 1 }
//   },
//   { ok: [ 'description.', 'This', 'is', 'a' ] },
//   {
//     conflict: {
//       a: [Array],
//       aIndex: 6,
//       o: [Array],
//       oIndex: 5,
//       b: [Array],
//       bIndex: 6
//     }
//   },
//   { ok: [ 'line.' ] }
// ]
```
The library marks multiple sections of the string as conflicts, since the same sentences have diverged in different way in the current and target version from the original base version.

Since in this kind of scenarios we cannot provide a satisfactory merge proposal, we will mark it as a conflict and propose the `current` version as the `merge` version.

In summary:
<table>
  <thead align="center">
    <tr>
      <th style="border-right:3px solid black">Use case</th>
      <th>Base version</th>
      <th>Current version</th>
      <th style="border-right:3px solid black">Target version</th>
      <th>Merged version (output)</th>
      <th>Conflict</th>
    </tr>
  </thead>
  <tbody >
    <tr>
      <td style="border-right:3px solid black">No customization, no updates (AAA)</td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td style="border-right:3px solid black"><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">User customization, no updates (ABA)</td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My CUSTOM description. <br>This is a second line.</pre></td>
      <td style="border-right:3px solid black"><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My CUSTOM description. <br>This is a second line.</pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">No customization, upstream update (AAB)</td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td style="border-right:3px solid black"><pre>My UDPATED description. <br>This is a second line.</pre></td>
      <td><pre>My UDPATED description. <br>This is a second line.</pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update match (ABB)</td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My GREAT description. <br>This is a second line.</pre></td>
      <td style="border-right:3px solid black"><pre>My GREAT description. <br>This is a second line.</pre></td>
      <td><pre>My GREAT description. <br>This is a second line.</pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update <b>solvable conflict</b> (ABC)</td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My GREAT description. <br>This is a second line.</pre></td>
      <td style="border-right:3px solid black"><pre>My description. <br>This is a second line, now longer.</pre></td>
      <td><pre>My GREAT description. <br>This is a second line, now longer.</pre></td>
      <td><pre>SOLVABLE</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update <b>non-solvable conflict</b> (ABC)</td>
      <td><pre>My description. <br>This is a second line.</pre></td>
      <td><pre>My GREAT description. <br>This is a third line.</pre></td>
      <td style="border-right:3px solid black"><pre>My EXCELLENT description. <br>This is a fourth line.</pre></td>
      <td><pre>My GREAT description. <br>This is a third line.</pre></td>
      <td><pre>NON_SOLVABLE</pre></td>
    </tr>
  </tbody>
</table>



#### Number fields

> Examples: `risk_score`, `max_signals`

Number fields should be treated as a whole unit, i.e. not breakable by digits. Therefore, there is only one possibility of conflicts, the scenario (A B C), which is not solvable. In that case, **keep the current version** with the user customization.

<table>
  <thead>
    <tr>
      <th style="border-right:3px solid black">Use case</th>
      <th>Base version</th>
      <th>Current version</th>
      <th style="border-right:3px solid black">Target version</th>
      <th>Merged version (output)</th>
      <th>Conflict</th>
    </tr>
  </thead>
  <tbody align="center">
    <tr>
      <td style="border-right:3px solid black">No customization, no updates (AAA)</td>
      <td><code>10</code></td>
      <td><code>10</code></td>
      <td style="border-right:3px solid black"><code>10</code></td>
      <td><code>10</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">User customization, no updates (ABA)</td>
      <td><code>10</code></td>
      <td><code>15</code></td>
      <td style="border-right:3px solid black"><code>10</code></td>
      <td><code>15</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">No customization, upstream update (AAB)</td>
      <td><code>10</code></td>
      <td><code>10</code></td>
      <td style="border-right:3px solid black"><code>15</code></td>
      <td><code>15</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update match (ABB)</td>
      <td><code>10</code></td>
      <td><code>20</code></td>
      <td style="border-right:3px solid black"><code>20</code></td>
      <td><code>20</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update conflict (ABC)</td>
      <td><code>10</code></td>
      <td><code>20</code></td>
      <td style="border-right:3px solid black"><code>30</code></td>
      <td><code>20</code></td>
      <td><code>NON_SOLVABLE</code></td>
    </tr>
  </tbody>
</table>

#### Array of scalar value (strings/numbers) fields

> Examples: `index`, `tags`, `references`,

For **arrays of scalar values** fields, we can create a Set-based logic to caclulate what the additions and removals where applied to the `base` version onto the `current` and `target` versions and do set manipulations to get a merged version.

For example:

**base**: [linux, network]  
**current**: [windows, host]  
**target**: [linux, ml]  
**expected output**: [windows, host, ml]  

The logic is as follows:

Changes to **current** compared against **base**:
- Added: [windows, host]
- Removed: [linux, network]


Changes to **target** compared against **base**:
- Added: [ml]
- Removed: [network]

Combining both modifications:
- Added: [windows, host, ml]
- Removed: [linux, network] (which elements were removed in both?)

Applying these combined modifications to base results in:
- **[windows, host, ml]**

This logic can be achieved using built-in Javascript `Set` logic:

```js
const base = new Set(["linux", "network"]);  
const current = new Set(["windows", "host"]);  
const target = new Set(["linux", "ml"]);  
const output = new Set(["windows", "host", "ml"]);  


const addedCurrent = current.difference(base); // [windows, host]
const removedCurrent = base.difference(current); // [linux, network]

const addedTarget = target.difference(base); // [ml]
const removedTarget = base.difference(target); // [network]

const bothAdded = addedCurrent.union(addedTarget); // [network]
const bothRemoved = removedCurrent.union(removedTarget); // [network]

const merged = base
                .union(addedTarget)
                .difference(bothRemoved);

// Results in: [windows, host, ml]
```

The possible scenarios are:

<table>
  <thead>
    <tr>
      <th style="border-right:3px solid black">Use case</th>
      <th>Base version</th>
      <th>Current version</th>
      <th style="border-right:3px solid black">Target version</th>
      <th>Merged version (output)</th>
      <th>Conflict</th>
    </tr>
  </thead>
  <tbody align="center">
    <tr>
      <td style="border-right:3px solid black">No customization, no updates (AAA)</td>
      <td><code>[linux,network]</code></td>
      <td><code>[linux,network]</code></td>
      <td style="border-right:3px solid black"><code>[linux,network]</code></td>
      <td><code>[linux,network]</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">User customization, no updates (ABA)</td>
      <td><code>[linux,network]</code></td>
      <td><code>[windows, host]</code></td>
      <td style="border-right:3px solid black"><code>[linux,network]</code></td>
      <td><code>[windows, host]</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">No customization, upstream update (AAB)</td>
      <td><code>[linux,network]</code></td>
      <td><code>[linux,network]</code></td>
      <td style="border-right:3px solid black"><code>[windows, host]</code></td>
      <td><code>[windows, host]</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update match (ABB)</td>
      <td><code>[linux,network]</code></td>
      <td><code>[linux,ml]</code></td>
      <td style="border-right:3px solid black"><code>[linux,ml]</code></td>
      <td><code>[linux,ml]</code></td>
      <td><code>NO</code></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update conflict (ABC)</td>
      <td><code>[linux,network]</code></td>
      <td><code>[windows, host]</code></td>
      <td style="border-right:3px solid black"><code>[linux, ml]</code></td>
      <td><code>[windows, host, ml]</code></td>
      <td><code>SOLVABLE</code></td>
    </tr>
  </tbody>
</table>

Notice that with this logic we would never mark a merge scenario as a conflict.


#### Array of objects fields

> Examples: `related_integrations,` `required_fields`

Since the properties in each object within the array are highly dependent on one another, the whole object should be treated as a block, and not attempt to diff or merge changes to individual fields within each element.

For example: in a `required_fields` update, if the `type` is updated from `unknown` in the base version to `keyword` in the `target` version, but in the same object the user has updated the base `name` of the field, the change of type will have a high probability of not making sense anymore - there is no way of knowing if the change proposed by Elastic will also apply to the field name that the user is now referring through its customization.

Therefore, to calculate a merged version, we will use a similar approach to the one used for "Array of strings", but instead of using `Set` logic, we will use `Maps` so that we can keep track of each objects based on an `id` and thus carry out algebraic operations on them to arrive to a merged version.

The `id` will vary depending on the type of the field:

|Field|Example object|Key used as `id`|
|---|---|---|
| `required_fields` | `{ ecs: true, name: 'host.name', type: 'keyword' }` | `name` |
| `related_integrations` | `{ "package": "aws", "version": "^2.0.0", "integration": "cloudtrail" }` | `package`+`integration` |

----
As an example - `A`, `B` and `C` are the keys of the objects in the array, and `modified` means that an object kept it's key id value, but some other propery of the object was modified:

**base**: [`A`, `B`]  
**current**: [`modified B `, `C`]  
**target**: [`modified B`, `D`]  

The logic is as follows:

Changes to **current** compared against **base**:
- Added: [`C`]
- Removed: [`A`]
- Modified: [`B`]

Changes to **target** compared against **base**:
- Added: [`D`]
- Removed: [`A`]
- Modified: [`B`]

In combination:
- Added: [`C`, `D`] (no conflicts)
- Removed: [`A`] (no conflicts)
- Modified: [`B`] (no conflict ONLY if the 2 objects were modified in exactly the same way)

So there are two possible results:

- No conflict: [`B`, `C`, `D`]
- Conflict: no acceptable merge proposal can be built, mark as `conflict` and propose the `current` version


----
The possible scenarios are:

<table>
  <thead align="center">
    <tr>
      <th style="border-right:3px solid black">Use case</th>
      <th>Base version</th>
      <th>Current version</th>
      <th style="border-right:3px solid black">Target version</th>
      <th>Merged version (output)</th>
      <th>Conflict</th>
    </tr>
  </thead>
  <tbody >
    <tr>
      <td style="border-right:3px solid black">No customization, no updates (AAA)</td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td style="border-right:3px solid black"><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">User customization, no updates (ABA)</td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "host.os.ip",
    type: "ip"
  },
]      
      </pre></td>
      <td style="border-right:3px solid black"><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "host.os.ip",
    type: "ip"
  },
]      
      </pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">No customization, upstream update (AAB)</td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td style="border-right:3px solid black"><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "host.os.ip",
    type: "ip"
  },
]    
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "host.os.ip",
    type: "ip"
  },
]    
      </pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update match (ABB)</td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "host.os.ip",
    type: "ip"
  },
]    
      </pre></td>
      <td style="border-right:3px solid black"><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "host.os.ip",
    type: "ip"
  },
]    
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "host.os.ip",
    type: "ip"
  },
]    
      </pre></td>
      <td><pre>NO</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update <b>solvable conflict</b> (ABC)<br><br> Object A modified in matching way</td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  },
  {
    ecs: false,
    name: "host.os.type",
    type: "keyword"
  },
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "new.field.name",
    type: "keyword"
  },
]    
      </pre></td>
      <td style="border-right:3px solid black"><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
  {
    ecs: false,
    name: "new.field.ip",
    type: "ip"
  },
]   
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
    {
    ecs: false,
    name: "new.field.name",
    type: "keyword"
  },
  {
    ecs: false,
    name: "new.field.ip",
    type: "ip"
  },
]
      </pre></td>
      <td><pre>SOLVABLE</pre></td>
    </tr>
    <tr>
      <td style="border-right:3px solid black">Customization and upstream update <b>non-solvable conflict</b> (ABC)<br><br> Object A modified in diverging ways, propose <b>current</b> version</td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "unknown"
  }
]      
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  },
]    
      </pre></td>
      <td style="border-right:3px solid black"><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "string"
  },
]   
      </pre></td>
      <td><pre>
[
  {
    ecs: true,
    name: "event.action",
    type: "keyword"
  }
]
      </pre></td>
      <td><pre><b>NON_SOLVABLE</b></pre></td>
    </tr>
  </tbody>
</table>

### Changes to Rule Upgrade UX/UI flow

#### Bulk accepting upgrades with no conflicts

Making prebuilt rules customizable, plus the changes introduced to the `/upgrade/_review` update described above means that the Upgrade Review endpoint will now determine that some of the rules have `CONFLICT`s that cannot be automatically resolved (the current behaviour is updating all rules to their `target` version).

However, since we still want to give the users the ability to update all of their rules that have updates with no conflicts in an easy and fast way, we need to introduce a distinct UI that allows for this behaviour.

The current UI of the **Rule Updates** page has an button with the label "Update all" which currently simply updates all rules to their `target` version.

We can replace this button for an **Update rules with no conflicts** button. Clicking this button would make a request to `/upgrade/_perform` with a payload that includes only rules that don't have non-solvable conflicts. That payload can be built out of the response of the `/upgrade/_review` endpoint, including ids of such rules and specifying that all rules should be updated to their `MERGED` version.

```ts
// [PSEUDOCODE]
const reviewUpgradeResponse: ReviewRuleUpgradeResponseBody = await fetch(
  '/internal/detection_engine/prebuilt_rules/upgrade/_review',
  { method: 'POST' }
);

// Filter out rules with conflicts, and create payload pointing all to 'MERGE' version
const performUpgradePayload = {
  mode: 'SPECIFIC_RULES',
  rules: reviewUpgradeResponse.rules
    .filter((rule) => !rule.diff.has_conflict)
    .map((rule) => ({
      rule_id: rule.rule_id,
      revision: rule.revision,
      version: rule.target_rule.version,
    })),
  pick_version: 'MERGE',
};


const performUpgradeResponse: PerformRuleUpgradeResponseBody = await fetch(
  '/internal/detection_engine/prebuilt_rules/upgrade/_perform',
  { method: 'POST', body: performUpgradePayload }
);
```

#### Upgrading rules with conflicts

Rules whose diffing algorithm resulted in a `CONFLICT` need to be manually resolved or confirmed by the user via the UI before making the API request to upgrade the rule.

> See [Three-Way-Diff Component ticket](https://github.com/elastic/kibana/issues/171520) that details UI for solving conflicts.

> See [designs](https://www.figma.com/file/gLHm8LpTtSkAUQHrkG3RHU/%5B8.7%5D-%5BRules%5D-Rule-Immutability%2FCustomization?type=design&mode=design&t=LkauhLzUKUatF6cL-0#712870904).







