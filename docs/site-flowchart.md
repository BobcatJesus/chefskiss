# Too Many Cooks Site Flowchart

## Customer Flow
```mermaid
flowchart TD
  A[Open app] --> B{Signed in?}
  B -- No --> C[Sign in / Sign up]
  B -- Yes --> D[Discover / Market]
  C --> D
  D --> E[Search food wanted tonight]
  E --> F[See matching cooks]
  F --> G[Open cook profile]
  F --> H[Open meal detail]
  G --> H
  H --> I[Checkout]
  I --> J[Place order]
  J --> K[Orders tracking]
  D --> L[Saved cooks]
  K --> L
```

## Cook Flow
```mermaid
flowchart TD
  A[Open app] --> B{Signed in?}
  B -- No --> C[Sign in / Sign up]
  B -- Yes --> D[Cook setup / profile]
  C --> D
  D --> E[Complete legal + safety info]
  E --> F[Upload permit + attestations]
  F --> G[Create meal]
  G --> H[Add meal photo]
  H --> I[Save meal]
  I --> J{Ready to publish?}
  J -- No --> E
  J -- Yes --> K[Publish to menu]
  K --> L[Public menu page]
  L --> M[Receive orders]
  M --> N[Manage availability]
```

## Shared Navigation
```mermaid
flowchart LR
  A[Any signed-in page] --> B[Bottom nav]
  B --> C[Market]
  B --> D[Saved]
  B --> E[My Menu]
  B --> F[Orders]
  B --> G[Account]
```

## One-Line Summary
Customers search for food and order it. Cooks complete compliance, publish meals with photos, and receive orders. The bottom nav keeps everyone from getting stuck.
