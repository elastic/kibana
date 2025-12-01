TODO: Move all items related to installation review to this file.

## Summary <!-- omit from toc -->

This test plan covers the following functionality of the "Add Elastic Rules" page:
- viewing a list of installable prebuilt rules and paginating through it
- filtering and sorting of the list by various rule fields

The actual installation of prebuilt rules is covered in the [prebuilt rule installation test plan](./prebuilt_rule_installation.md).

## Table of contents <!-- omit from toc -->

<!--
Please use the "Markdown All in One" VS Code extension to keep the TOC in sync with the text:
https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
-->

- [Scenarios](#scenarios)
  - [Base cases](#base-cases)
    - [**Scenario: Already installed rules are not shown in prebuilt rules table**](#scenario-already-installed-rules-are-not-shown-in-prebuilt-rules-table)
    - [**Scenario: Only latest versions of each prebuilt rule are shown in prebuilt rules table**](#scenario-only-latest-versions-of-each-prebuilt-rule-are-shown-in-prebuilt-rules-table)
  - [Loading and navigation](#loading-and-navigation)
    - [**Scenario: User opening the Add Elastic Rules page sees a loading skeleton until the package installation is completed**](#scenario-user-opening-the-add-elastic-rules-page-sees-a-loading-skeleton-until-the-package-installation-is-completed)
    - [**Scenario: User can navigate from the Add Elastic Rules page to the Rule Management page via breadcrumbs**](#scenario-user-can-navigate-from-the-add-elastic-rules-page-to-the-rule-management-page-via-breadcrumbs)
  - [Pagination](#pagination)
    - [**Scenario: User can paginate over prebuilt rules on Add Elastic Rules page**](#scenario-user-can-paginate-over-prebuilt-rules-on-add-elastic-rules-page)
    - [**Scenario: Last page shows correct number of rules**](#scenario-last-page-shows-correct-number-of-rules)
  - [Sorting](#sorting)
    - [**Scenario: User can sort prebuilt rules on Add Elastic Rules page**](#scenario-user-can-sort-prebuilt-rules-on-add-elastic-rules-page)
    - [**Scenario: Navigating to the next page maintains the sorting order**](#scenario-navigating-to-the-next-page-maintains-the-sorting-order)
    - [**Scenario: Changing sorting resets pagination to the first page**](#scenario-changing-sorting-resets-pagination-to-the-first-page)
    - [**Scenario: User can sort filtered prebuilt rules**](#scenario-user-can-sort-filtered-prebuilt-rules)
  - [Filtering](#filtering)
    - [**Scenario: User can filter prebuilt rules by rule name on the Add Elastic Rules page**](#scenario-user-can-filter-prebuilt-rules-by-rule-name-on-the-add-elastic-rules-page)
    - [**Scenario: User can see a list of available tags on the Add Elastic Rules page**](#scenario-user-can-see-a-list-of-available-tags-on-the-add-elastic-rules-page)
    - [**Scenario: User can filter prebuilt rules by a single tag on the Add Elastic Rules page**](#scenario-user-can-filter-prebuilt-rules-by-a-single-tag-on-the-add-elastic-rules-page)
    - [**Scenario: User can filter prebuilt rules by multiple tags using AND logic on the Add Elastic Rules page**](#scenario-user-can-filter-prebuilt-rules-by-multiple-tags-using-and-logic-on-the-add-elastic-rules-page)
    - [**Scenario: User can filter prebuilt rules by name and tags at the same time**](#scenario-user-can-filter-prebuilt-rules-by-name-and-tags-at-the-same-time)
    - [**Scenario: Empty state is shown when filters match no rules**](#scenario-empty-state-is-shown-when-filters-match-no-rules)
    - [**Scenario: Removing filters resets prebuilt rules table pagination**](#scenario-removing-filters-resets-prebuilt-rules-table-pagination)
  - [Licensing](#licensing)
    - [**Scenario: ML rules are not shown in prebuilt rules installation table when license is insufficient**](#scenario-ml-rules-are-not-shown-in-prebuilt-rules-installation-table-when-license-is-insufficient)
  - [Authorization / RBAC](#authorization--rbac)
    - [**Scenario: User with read privileges on Security Solution cannot install prebuilt rules**](#scenario-user-with-read-privileges-on-security-solution-cannot-install-prebuilt-rules)
    - [**Scenario: ML rules are not shown in prebuilt rules installation table when user is not an ML admin**](#scenario-ml-rules-are-not-shown-in-prebuilt-rules-installation-table-when-user-is-not-an-ml-admin)


## Scenarios

### Base cases

#### **Scenario: Already installed rules are not shown in prebuilt rules table**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given there is at least one prebuilt rule installed in Kibana
And there's a prebuilt rule asset with the same rule_id
When user opens the Add Elastic Rules page
Then the table should not show the already installed rule
```

#### **Scenario: Only latest versions of each prebuilt rule are shown in prebuilt rules table**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given there are multiple prebuilt rule assets with the same rule_id in Kibana
And a rule with such rule_id is NOT installed
When user opens the Add Elastic Rules page
Then the table should show an entry only for the latest version of prebuilt rule asset
```

### Loading and navigation

#### **Scenario: User opening the Add Elastic Rules page sees a loading skeleton until the package installation is completed**

**Automation**: 1 UI unit test.

```Gherkin
Given prebuilt rules package is not installed
When user opens the Add Elastic Rules page
Then user should see a loading skeleton until the package installation is completed
```

#### **Scenario: User can navigate from the Add Elastic Rules page to the Rule Management page via breadcrumbs**

**Automation**: 1 e2e test.

```Gherkin
Given user is on the Add Elastic Rules page
When user navigates to the Rule Management page via breadcrumbs
Then the Rule Management page should be displayed
```

### Pagination

#### **Scenario: User can paginate over prebuilt rules on Add Elastic Rules page**

**Automation**: 1 e2e test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Add Elastic Rules page
Then prebuilt rules available for installation should be shown
When user picks the desired number of <rows_per_page>
Then the <rows_per_page> of the available prebuilt rules should be shown on the page
When user navigates to the next page
Then the next page of the available prebuilt rules should be shown
And user-selected number of <rows_per_page> should still apply to the page
```

**Examples:**

`<rows_per_page>` = 5 | 10 | 20 | 50 | 100

#### **Scenario: Last page shows correct number of rules**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given that number of prebuilt rules available for installation is not a multiple of <rows_per_page>
When user navigates to the last page
Then the number of rules shown on the page should be less than <rows_per_page>
```

### Sorting

#### **Scenario: User can sort prebuilt rules on Add Elastic Rules page**

**Automation**: 1 e2e test with mock rules (single field) + 1 API integration test with mock rules (to test each particular field)

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Add Elastic Rules page
Then the available prebuilt rules should be shown
And the rules shouldn't be sorted by any field
When user clicks on a header of an unsorted <field_name> column
Then the available prebuilt rules should be sorted by <field_name> in the ASC <order_type>
When user clicks on a header of an ASC sorted <field_name> column
Then the available prebuilt rules should be sorted by <field_name> in the DESC <order_type>
When user clicks on a header of a DESC sorted <field_name> column
Then the available prebuilt rules should be unsorted by <field_name>
```

**Examples:**

| `<field_name>`  | `<order_type>`                                         |
| --------------- | ------------------------------------------------------ |
| name            | alphabetical                                           |
| risk score      | numeric (ASC: 0 -> 100, DESC: 100 -> 0)                |
| severity        | semantic (ASC: Low -> Critical, DESC: Critical -> Low) |

#### **Scenario: Navigating to the next page maintains the sorting order**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Add Elastic Rules page
And sorts the rules by <field>
And navigates to the next page
Then the available prebuilt rules should still be sorted by <field>
```

#### **Scenario: Changing sorting resets pagination to the first page**

**Automation**: 1 e2e test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
And there's more than one page of available prebuilt rules
When user opens the Add Elastic Rules page
And navigates to a non-first page
And changes the sorting order
Then the first page of available prebuilt rules should be shown
And the available prebuilt rules should be sorted by <field>
```

#### **Scenario: User can sort filtered prebuilt rules**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
And at least one rule has a <tag> tag
When user opens the Prebuilt Rules installation page
And filters the available prebuilt rules by a <tag>
And sorts the filtered rules by <field>
Then only available rules that have a <tag> tag should be shown
And the shown rules should be sorted by <field>
```

### Filtering

#### **Scenario: User can filter prebuilt rules by rule name on the Add Elastic Rules page**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Add Elastic Rules page
Then the available prebuilt rules should be shown
When user enters <text> in the search field
Then only available prebuilt rules that contain <text> in any part of their name should be shown
And this matching should be case-insensitive
```

#### **Scenario: User can see a list of available tags on the Add Elastic Rules page**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Add Elastic Rules page
Then there should a UI element that shows a list tags
And this list should contain all the tags from prebuilt rules available for installation
And this list should be sorted alphabetically
```

#### **Scenario: User can filter prebuilt rules by a single tag on the Add Elastic Rules page**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
And at least one rule has a <tag> tag
When user opens the Add Elastic Rules page
And filters the available prebuilt rules by a <tag>
Then only the available prebuilt rules having this tag should be shown
```

#### **Scenario: User can filter prebuilt rules by multiple tags using AND logic on the Add Elastic Rules page**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
And at least one rule has both <tag1> and <tag2> tags
When user opens the Add Elastic Rules page
And filters the available prebuilt rules by <tag1> and <tag2> tags
Then only available prebuilt rules having both <tag1> and <tag2> tags should be shown
```

#### **Scenario: User can filter prebuilt rules by name and tags at the same time**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
And at least one rule has a <tag> tag and contains <text> in its name
When user opens the Add Elastic Rules page
And filters the available prebuilt rules by a <tag>
And enters <text> in the search field
Then only available prebuilt rules having <tag> tag and containing <text> in their name should be shown
```

#### **Scenario: Empty state is shown when filters match no rules**

**Automation**: 1 e2e test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Add Elastic Rules page
And applies a filter that matches no rules
Then no rules should be shown in the table
And user should see a "no rules match your filters" message
```

#### **Scenario: Removing filters resets prebuilt rules table pagination**

**Automation**: 1 e2e test with mock rules.

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Add Elastic Rules page
Then the available prebuilt rules should be shown
When user sets a non-default number of rows per page
And filters the available prebuilt rules by any tag
And goes to the next page
And then removes the tag filter
Then the first page of unfiltered available prebuilt rules should be shown again
And the total number of pages should be the same as before applying the filter
And the number of rows per page should not reset to the default value
```

### Licensing

#### **Scenario: ML rules are not shown in prebuilt rules installation table when license is insufficient**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given a Kibana instance running under a license that does NOT support machine learning
And a prebuilt rule asset with of a machine learning rule exists in Kibana
And this rule is not installed
When user opens the Add Elastic Rules page
Then user should NOT see this ML rule in the table
```

### Authorization / RBAC

#### **Scenario: User with read privileges on Security Solution cannot install prebuilt rules**

**Automation**: 1 e2e test with mock rules + 3 integration tests with mock rules for the status and installation endpoints.

```Gherkin
Given user with "Security: read" privileges on Security Solution
And prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Elastic Rules page
Then user should see prebuilt rules available to install
But user should not be able to install them
```

#### **Scenario: ML rules are not shown in prebuilt rules installation table when user is not an ML admin**

**Automation**: 1 API integration test with mock rules.

```Gherkin
Given a Kibana instance running under a license that DOES support machine learning
And a prebuilt rule asset with of a machine learning rule exists in Kibana
And current user does NOT have a `machine_learning_admin` role (or its equivalent ES and Kibana privileges)
And a prebuilt rule asset with of a machine learning rule exists in Kibana
And this rule is not installed
When user opens the Add Elastic Rules page
Then user should NOT see this ML rule in the table
```
