# Navigation

## Testing

Navigation exists in three states for observability:

1. Classic - Observability is one of several available solutions
2. Solution View - Observability is the solution of focus
3. Serverless - Observability plays a role, but is not the focus

### Creating necessary environments

Adding the following labels to your PR will trigger a deploy job in Buildkite:

```
ci:cloud-deploy
ci:cloud-persist-deployment
ci:project-deploy-elasticsearch
```

The output of the buildkite jobs will display instructions on how to connect to these environments.

### Test cases

#### Core navigations

Each navigation solution has two core parts: side navigation, and breadcrumbs.
The outcome of testing each part assumes the following:

Side navigation opens and closes correctly, based on the deployment type (classic or solution view / serverless) and solution view.

- Expect classic view to have all plugins displayed in a single column for the Kibana home page, with the observability nav bar to appear once the user navigates to the solution.

  - Once the user navigates to the observability solution, the nav bar should appear with the obs plugins as outlined in these plugin files:
    - [Observability](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/observability/public/plugin.ts)
    - [Synthetics](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/synthetics/public/plugin.ts)
    - [User Experience](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/ux/public/plugin.ts)

- Expect solution view to have a collapsed view of nav sections with headers, with each view visible in a flyout once the header is clicked on.

  - Side nav for solution view should appear as outlined in this [config](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/observability/public/navigation_tree.ts).

- In serverless, observability plugins will become available in central navigation

  - Side nav for serverless mode should appear as outlined in this [config](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/serverless_observability/public/navigation_tree.ts).

- Expect breadcrumbs to logically follow the organization of the navigation bar. There are some exceptions, where the first entry under a subheader may act as a default page or route to an external view. Otherwise, for modules such as SLO, Alerts, and Monitors, you should exect the breadcrumbs to lead to:

```
Observability -> Module -> Plugin
```

or

```
Observability -> Plugin -> CRUD Flow
```

- Expect all but the final breadcrumb should be blue and clickable.
- Expect all clickable breadcrumbs to lead to a non-empty page.

#### Other navigation areas

"Annotations" and "Add data" should render as separate pages.

#### Other areas to test

- Expect the side navigation bar to be collapsible.
- App router responds to browser navigation and adheres to browser history.
