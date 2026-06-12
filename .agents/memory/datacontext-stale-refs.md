---
name: DataContext useMemo stale refs → Invalid hook call
description: Undefined variables in the DataContext useMemo value object cause "Invalid hook call" in React, not a ReferenceError
---

## Rule
If you remove state variables from `DataProvider` (e.g. `user`, `login`, `logout`) you MUST also remove them from the `useMemo<DataContextValue>` value object AND its dependency array. Leaving them causes React to throw "Invalid hook call" instead of the expected "X is not defined".

**Why:** Metro/React's error recovery path for ReferenceErrors thrown during hook evaluation sometimes surfaces as "Invalid hook call" rather than the true underlying error.

**How to apply:** After removing any state from DataProvider, grep for its name in the same file and purge all references from the value object, deps array, and the DataContextValue interface.
