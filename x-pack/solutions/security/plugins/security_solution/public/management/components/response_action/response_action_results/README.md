# Response action result component developer guidelines

The `<ResponseActionResults>` component is used to display the results of a response action. It takes in an `ActionDetails` object and renders the status of the action for each host that the action was applied to along with the output returned by Endpoint. The component handles all response actions and should be the only component used when needing to display results for a response action


## Structure

- `response_action_results.tsx` : The main component. Its responsibility is to handle display of single agent -vs- multi-agent actions in a standard way and calling the associated response action result component to display the results of the action.
- `./components/*` : Directory that includes the components that display the results of a specific response action type. Each component here should be responsible only for the display of the results for a **single agent** - whether successful, failed, expired or canceled. Components in this directory should not be used outside the `<ResponseActionResults>` main component.  Each result component here should also handle EDR specific needs so that all action related result displays are maintained in one place.






