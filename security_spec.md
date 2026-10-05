# Security Specification: OrderLine Voice Ordering Platform

## 1. Data Invariants
1. **Public vs Restricted Access**:
   - Menu items and restaurant location details are publicly readable so prospective diners and ordering clients can view menus and store details.
   - Orders (`orders`) can be created by guest table sessions, but status changes and staff messages require staff/admin or match of active session.
   - Waitlist and signups can be created by unauthenticated visitors (e.g. landing page leads), but modifying or deleting signups and customer records requires authentication/admin.
   - Live call sessions and POS bridge orders represent sensitive operational communication; creation and updates require valid validation helpers and authenticated operators or administrative rights.
   - Customer CRM records with phone numbers and notes are private to authenticated restaurant personnel.
2. **Identity Integrity**:
   - Authenticated user records in `/users/{userId}` can only be written if `request.auth.uid == userId`.
   - Bootstrapped admin is `chrisfbailey.CB@gmail.com` (when `email_verified == true`).
3. **ID & Volumetric Hardening**:
   - All document IDs must pass `isValidId()` (size <= 128 chars, matching regex `^[a-zA-Z0-9_-]+$`).
   - String inputs have strict size boundaries (`.size() <= MAX`) to prevent Denial of Wallet payload exhaustion.
4. **State Transitions**:
   - Order statuses follow strict enumeration: `["new", "confirmed", "preparing", "ready", "done"]`.
   - Call session statuses follow: `["active", "holding", "ai_ordering", "forwarding", "completed", "dropped"]`.
   - Bridge order statuses follow: `["pending", "processing", "entered", "error"]`.

---

## 2. The "Dirty Dozen" Payloads
The following 12 attack vectors must be rejected with `PERMISSION_DENIED`:

1. **Payload 1: Unauthenticated Read of Customer CRM Profiles**
   - Target: `GET /customers/cust-123` with `request.auth == null`
   - Expected: PERMISSION_DENIED
2. **Payload 2: ID Poisoning Attack**
   - Target: `POST /orders/invalid..$$id!!` with 2KB junk character ID
   - Expected: PERMISSION_DENIED
3. **Payload 3: Unauthenticated Mutation of POS Bridge Orders**
   - Target: `PATCH /bridgeOrders/bridge-1` with `{ status: "entered" }` without auth
   - Expected: PERMISSION_DENIED
4. **Payload 4: Shadow Field Injection in Menu Items**
   - Target: `POST /menuItems/item-1` with `{ name: "Burger", price: 1000, category: "Mains", available: true, isHacked: true, shadowAdmin: true }`
   - Expected: PERMISSION_DENIED
5. **Payload 5: Oversized Denial-of-Wallet Payload**
   - Target: `POST /orders/order-1` with `customerName` exceeding 128 characters (e.g. 5,000 bytes)
   - Expected: PERMISSION_DENIED
6. **Payload 6: Unauthorized User Profile Takeover**
   - Target: `PUT /users/user-victim` authored by `auth.uid = "attacker-1"`
   - Expected: PERMISSION_DENIED
7. **Payload 7: Unverified Admin Email Spoofing**
   - Target: `PUT /restaurantConfigs/charlies-demo` with `request.auth.token.email = "chrisfbailey.CB@gmail.com"` but `token.email_verified = false`
   - Expected: PERMISSION_DENIED
8. **Payload 8: State Shortcutting / Malformed Status in Orders**
   - Target: `PATCH /orders/order-1` with `{ status: "COMPLETED_UNAUTHORIZED_BYPASS" }`
   - Expected: PERMISSION_DENIED
9. **Payload 9: Negative Price Exploitation**
   - Target: `POST /menuItems/item-free` with `{ name: "Steak", price: -500, category: "Mains", available: true }`
   - Expected: PERMISSION_DENIED
10. **Payload 10: Unauthorized Deletion of Call Sessions**
    - Target: `DELETE /callSessions/call-1` by non-admin guest
    - Expected: PERMISSION_DENIED
11. **Payload 11: Modifying Immutable Keys in Bridge Orders**
    - Target: `PATCH /bridgeOrders/bridge-1` modifying `orderId` or `createdAt`
    - Expected: PERMISSION_DENIED
12. **Payload 12: Blanket List Scrape without Filter**
    - Target: `LIST /users` by unauthenticated caller
    - Expected: PERMISSION_DENIED
