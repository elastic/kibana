# Feature Tour on the Rule Management Page

This folder contains an implementation of a feature tour UI for new features introduced in `8.1.0`.
This implementaion is currently unused - all usages have been removed from React components.
We might revisit this implementation in the next releases when we have something new for the user
to demonstrate on the Rule Management Page.

## A new way of building tours

The EUI Tour has evolved and continues to do so.

New features and fixes to track:

- Support for previous, next and go to step [#4831][1]
- Built-in 'Next' button [#5715][2]

## How to revive this tour for the next release (if needed)

1. Update Kibana version in `NEW_FEATURES_TOUR_STORAGE_KEYS.RULE_MANAGEMENT_PAGE`.
  Set it to a version you're going to implement a feature tour for.

2. Define the steps for your tour. See `RulesFeatureTour` and `stepsConfig`.

3. Define and set an anchor `id` for every step's target HTML element.

4. Render `RulesFeatureTour` component somewhere on the Rule Management page.
   Only one instance of that component should be present on the page.

5. Consider abstracting away persistence in Local Storage and other functionality that
  may be common to tours on different pages.

## Useful links

Docs: [`EuiTour`](https://elastic.github.io/eui/#/display/tour).

For reference, PRs where this Tour has been introduced or changed:

- added in `8.1.0` ([PR](https://github.com/elastic/kibana/pull/124343))
- removed in `8.2.0` ([PR](https://github.com/elastic/kibana/pull/128398))

<!-- Links -->

[1]: https://github.com/elastic/eui/issues/4831
[2]: https://github.com/elastic/eui/issues/5715
