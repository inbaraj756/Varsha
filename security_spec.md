# Varsha Ledger — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Valid Roll Identity**: Every document in `/rolls/{rollId}` must have a `rollId` matching integer strings `301`–`400` (`^(3[0-9]{2}|400)$`), and `incoming().rollNumber` must equal `int(rollId)` and stay immutable across updates.
2. **Valid Settings Identity**: `/settings/{settingId}` is restricted to `settingId == 'ledger'` with `totalRolls == 100`, non-negative `unitRate <= 1000000`, and bounded strings.
3. **Strict Admin Writes**: Only verified, authorized administrators (`v9842957434@gmail.com` with `email_verified == true`, or UIDs registered in `/admins/{uid}` with `email_verified == true`) may create, update, delete, or `list` `/rolls`, `/settings`, or `/admins`.
4. **No Self-Promotion**: Users cannot create or update `/admins/{uid}` unless the requester is already a verified administrator.
5. **No Blanket Listing for Public**: `allow list` on `/rolls` and `/settings` and `/admins` is strictly forbidden for non-admins. Individual single-document `get` on `/rolls/{rollId}` (301–400) and `/settings/ledger` allows exact-roll Person Login (`Username = Roll #, Password = Roll #`) without exposing the full 100-roll list.
6. **Strict Schema & Server Timestamps**: Every write enforces `keys().hasAll(...)` and `keys().hasOnly(...)`, type/range/size limits, and `updatedAt == request.time` (or `createdAt == request.time`).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)
1. Unauthenticated write to `/rolls/301`.
2. Signed-in non-admin user trying to write `/rolls/301`.
3. Non-admin trying to `list` `/rolls` (attempting to scrape all 100 persons).
4. Admin writing a "Shadow / Ghost Field" (`isVerified: true`) into `/rolls/301`.
5. Admin injecting an oversized `name` (> 80 chars) or `notes` (> 200 chars) into `/rolls/301`.
6. Admin injecting negative `entries: -5` or non-integer `entries: "ten"` into `/rolls/301`.
7. Admin writing mismatched `rollNumber: 302` under `/rolls/301` or mutating `rollNumber` on update.
8. Admin spoofing `updatedBy` to another UID instead of `request.auth.uid`.
9. Admin spoofing a backdated client timestamp `updatedAt` instead of `request.time`.
10. Unverified email admin (`email_verified == false`) attempting to write `/rolls/301` or `/settings/ledger`.
11. Signed-in non-admin attempting self-promotion by writing `/admins/{theirUid}`.
12. Creating `/rolls/999` or `/rolls/invalid_id` outside the `301..400` range or creating `/settings/other`.
