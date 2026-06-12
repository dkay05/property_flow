---
name: DataProvider auth bridge pattern
description: Pattern for triggering data refresh when auth state changes without importing useAuth into DataProvider
---

## Rule
DataProvider must NOT call `useAuth()` directly. Instead, put a bridge effect inside `AuthGate` (in `_layout.tsx`) that calls `refreshData()` when `isAuthenticated` changes.

```tsx
// In _layout.tsx — AuthGate already has access to both contexts
function AuthGate({ children }) {
  const { isAuthenticated } = useAuth();
  const { refreshData } = useData();
  useEffect(() => {
    if (isAuthenticated) refreshData();
  }, [isAuthenticated]);
  ...
}
```

**Why:** Calling `useAuth()` inside `DataProvider` can cause HMR instability and circular-import-like failures in Metro. The bridge keeps the two contexts cleanly separated.

**How to apply:** Any time you need auth state to drive a DataProvider side-effect, put the effect inside `AuthGate` or a dedicated bridge component that sits between both providers.
