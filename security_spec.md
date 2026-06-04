# Security Specification - Real-Time Tea Ordering System

## Data Invariants

1. **Drink Inventory Integrity**:
   - Access to customize drink names, price, category is strictly prohibited to general customers/public.
   - General customers can only decrement the `stock` during a valid order placement. Other properties (`name`, `priceM`, `priceL`, `category`) must remain immutable.
2. **Order Constraints**:
   - Anyone can create an order, but its initial state must be `pending`.
   - General customers cannot arbitrarily update orders once placed (such as changing the total amount, customer information, or bridging status to `completed` or `preparing`).
   - The status field transitions must be sequential, and terminal status (completed/cancelled) locks the order from further modifications.
3. **Admin Panel Access**:
   - The database credentials block (`admin_config/credentials`) is strictly read-only or fully locked down. General users should never be able to view or overwrite the admin password hash.

---

## The "Dirty Dozen" Payloads (Malicious Writes / Attacks)

1. **Attack 01 (Privilege Escalation on Drinks)**: Attempt to overwrite a drink's price to `$0` or rename a drink.
2. **Attack 02 (Arbitrary Inventory Generation)**: Attempt to create a new mock drink with massive stock without admin auth.
3. **Attack 03 (Negative Inventory Trick)**: Attempt to set a drink's stock to `-100`.
4. **Attack 04 (Invalid Type Stock Injection)**: Attempt to update `stock` with string `"infinite"`.
5. **Attack 05 (Order Status Spoofing)**: Attempt to create a new order with state already set to `completed`.
6. **Attack 06 (Order Total Tampering)**: Attempt to update an already placed order and change `totalAmount` to `$0`.
7. **Attack 07 (Order Status Escalation)**: Attempt to update an existing order's status directly from `pending` to `completed`.
8. **Attack 08 (Junk/XSS Payload injection on Order name)**: Injecting 2MB string or XSS characters in `customerName` field of an order.
9. **Attack 09 (Admin Hash Theft)**: An unauthenticated client attempting to read `admin_config/credentials`.
10. **Attack 10 (Admin Config Overwrite)**: Unauthenticated client attempting to write or change `admin_config/credentials` to set their own password.
11. **Attack 11 (Order Time Manipulation)**: Attempting to set `createdAt` back to the year 1990 in order creation.
12. **Attack 12 (Inventory Shadow Update)**: Attempting to append an unauthorized hidden key `isPromoItem: true` during stock decrement.

---

## Rules Testing Specifications

We will define rules in `firestore.rules` to ensure all these attacks are successfully blocked with `PERMISSION_DENIED`.
Since we require standard firestore rules, we'll design a highly robust, self-contained `firestore.rules` and write a declarative test spec verifying the outcome.
