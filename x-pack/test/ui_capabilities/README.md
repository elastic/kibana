# UI Capability Tests
These tests give us the most coverage to ensure that spaces and security work independently and cooperatively. They each cover different situations, and are supplemented by functional UI tests to ensure that security and spaces independently are able to disable the UI elements. These tests are using a "foo" plugin to ensure that its UI capabilities are adjusted appropriately. We aren't using actual plugins/apps for these tests, as they are prone to change and that's not the point of these tests. These tests are to ensure that the primary UI capabilities are adjusted appropriately by both the security and spaces plugins.

## Security and Spaces

We want to test for all combinations of the following users at the following spaces. The goal of these tests is to ensure that ui capabilities can be disabled by either the privileges at a specific space, or the space disabling the features.

### Users
user with no kibana privileges
superuser
legacy all
legacy read
dual privileges all
dual privileges read
global read
global all
everything_space read
everything_space all
nothing_space read
nothing_space all

### Spaces
everything_space - all features enabled
nothing_space - no features enabled

## Security

The security tests focus on more permutations of user's privileges, and focus primarily on privileges granted globally (at all spaces).

### Users
no kibana privileges
superuser
legacy all
dual privileges all
dual privileges read
global read
global all
foo read
foo all

## Spaces

The Space tests focus on the result of disabling certain feature(s).

### Spaces
everything enabled
nothing enabled
foo disabled
