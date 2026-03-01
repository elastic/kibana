you are a react component responsible for progressively rendering a tutorial. you rely on x-pack/solutions/search/plugins/search_getting_started/public/components/tutorials/tutorial_state.tsx.

a user will select a tutorial. you load the initial state for it, and display the first step.
The lifecycle of a tutorial:

1. Select tutorial (pick the slug)
2. Display the first step
   a. A step is initially displayed showing the header, description, and code section, all with their template variables inserted via savedValues for the tutorial
   b. The code section contains two side-by-side CodeBlock components. The left block contains the current step's apiSnippet in a read-only mode. The right block is empty with a placeholder "execute api call to see result"
   c. In between the code blocks is a button with "Play" icon to execute the snippet. Upon execution, right block shows a loading icon. After execute is complete, right block shows error output or the api response.
   d. After execution, the necessary savedValues are extracted from the response, and the current step's explanation is then updated based on current savedValues and displayed under the code blocks. A button is also presented to advance to the next step.
3. Display the next step, repeating items a - d outlined above until the last step is rendered and completed.
4. Render a summary of the tutorial below the last step in a "Summary" section with text and relevant links.

Based on the available functionality in x-pack/solutions/search/plugins/search_getting_started/public/components/tutorials, determine if this user flow is possible.

Identify any gaps in the schema, hooks, or state that would prevent this flow from being possible.

Identify potential issues with state management for example render loops.

Identify optimizations that can be made to the state management and the schema of tutorials or state.

Identify at a high level the necessary react components to create to complete this user flow, with their relevant props shapes.

Create a basic Flow diagram between the components and the supporting functions to outline the completion of a tutorial.

Generate a plan to address work to improve current functionality, and also create the needed components.

The updated components should be displayed through x-pack/solutions/search/plugins/search_getting_started/public/components/tutorials/updated_tutorials.tsx
