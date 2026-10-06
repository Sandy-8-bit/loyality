# Digital Loyalty Card System --- Product & Technical Specification

## 1. Project Overview

A digital loyalty card system for a physical shop.

Customers scan a QR code displayed in the shop, open the loyalty
website, verify their mobile number using OTP, and access their digital
loyalty card.

The shop/admin can:

-   View registered customers
-   View customer mobile numbers and names
-   Generate temporary redemption/visit codes
-   Validate customer codes
-   Track six loyalty checkpoints
-   Configure the free sixth dish/reward with an image and name
-   Automatically reset the loyalty card after the sixth successful
    checkpoint

### Technology Stack

  Layer            Technology
  ---------------- --------------------------------------------
  Frontend         Next.js
  Language         TypeScript
  Styling          Tailwind CSS
  Backend/API      Next.js Server Actions / Route Handlers
  Database         Supabase PostgreSQL
  Authentication   Supabase Auth / OTP
  Storage          Supabase Storage
  QR Entry         Static QR code pointing to loyalty website
  Deployment       Vercel + Supabase

------------------------------------------------------------------------

# 2. User Types

The system has two main panels:

## Customer Panel

Used by customers to:

1.  Enter their mobile number
2.  Verify OTP
3.  Create/access their profile
4.  View their digital loyalty card
5.  View completed loyalty checkpoints
6.  Enter the temporary shop-generated code
7.  Receive a checkpoint after successful validation
8.  See the free dish/reward after completing all six checkpoints

## Admin Panel

Used by the shopkeeper/admin to:

1.  Login securely
2.  View customers
3.  View customer name and mobile number
4.  Search customers
5.  Generate temporary validation codes
6.  See generated code expiry
7.  Validate/manage customer loyalty progress
8.  Configure the sixth/free dish
9.  Upload reward image
10. Set reward name
11. Monitor completed loyalty cards

------------------------------------------------------------------------

# 3. Customer Journey

## Step 1 --- Scan QR Code

A QR code is displayed inside the shop.

Example:

``` text
Customer
   ↓
Scan QR Code
   ↓
Loyalty Website
```

The QR code should point to:

``` text
https://yourdomain.com/loyalty
```

The QR code does not need to contain customer information.

------------------------------------------------------------------------

## Step 2 --- Mobile Number

When the customer opens the website, show:

``` text
Welcome to [Shop Name]

Enter your mobile number

[ +91 __________ ]

[ Continue ]
```

The mobile number should be validated before continuing.

Recommended rules:

-   India-first phone number validation
-   Store the number in normalized format
-   Prevent duplicate customer profiles

Example:

``` text
+91 9876543210
```

------------------------------------------------------------------------

# 4. OTP Verification

After the customer enters the mobile number:

``` text
Mobile Number
      ↓
Send OTP
      ↓
Customer enters OTP
      ↓
Verify OTP
      ↓
Customer authenticated
```

Example UI:

``` text
Verify your number

OTP sent to
+91 98765 XXXXX

[ _ ][ _ ][ _ ][ _ ][ _ ][ _ ]

[ Verify ]

Didn't receive OTP?
Resend OTP
```

Supabase Auth can be used for OTP authentication.

After successful OTP verification:

-   Create a customer profile if one does not already exist.
-   If the customer already exists, load the existing profile.
-   Create/login the customer session.
-   Redirect to the loyalty profile.

------------------------------------------------------------------------

# 5. Customer Profile

The customer profile should contain:

-   Customer name
-   Mobile number
-   Loyalty progress
-   Number of completed checkpoints
-   Current reward status

Example:

``` text
Hi, Arun 👋

+91 98765 43210

Your Loyalty Card

[ ✓ ] [ ✓ ] [ ✓ ] [ ○ ] [ ○ ] [ ○ ]

3 / 6 Completed

Complete 3 more visits to unlock your free dish!
```

The customer should not be able to manually mark a checkpoint as
completed.

A checkpoint can only be added after successful validation of a
shop-generated code.

------------------------------------------------------------------------

# 6. Loyalty Card Logic

The loyalty card contains exactly six checkpoints.

``` text
Checkpoint 1
Checkpoint 2
Checkpoint 3
Checkpoint 4
Checkpoint 5
Checkpoint 6
```

Initially:

``` text
[ ○ ] [ ○ ] [ ○ ] [ ○ ] [ ○ ] [ ○ ]
```

After the first successful purchase/code validation:

``` text
[ ✓ ] [ ○ ] [ ○ ] [ ○ ] [ ○ ] [ ○ ]
```

After three:

``` text
[ ✓ ] [ ✓ ] [ ✓ ] [ ○ ] [ ○ ] [ ○ ]
```

After six:

``` text
[ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ]
```

------------------------------------------------------------------------

# 7. Temporary Code System

The shopkeeper/admin generates a temporary code from the Admin Panel.

## Generate Code

Admin clicks:

``` text
Generate Code
```

The system creates a unique temporary code.

### Code format

The business requirement is:

-   Four digits
-   Two alphabet characters
-   Associated with the current date

Recommended display format:

``` text
4827AB
```

The current date should be stored separately in the database rather than
making the date part of the six-character code.

Example database record:

``` text
Code: 4827AB
Date: 2026-10-06
Created: 10:30:00
Expires: 10:35:00
Status: Active
```

If the business specifically wants the date visible in the code, the
display format can instead be:

``` text
061026-4827AB
```

However, the recommended validation code is the shorter:

``` text
4827AB
```

with the date and timestamps stored securely in the database.

------------------------------------------------------------------------

# 8. Code Expiration

Every generated code must expire after exactly five minutes.

Example:

``` text
Generated:
10:30 AM

Expires:
10:35 AM
```

After expiration:

``` text
Code Status = Expired
```

An expired code must never be accepted.

### Important Security Rule

The expiration must be checked on the server.

Do NOT rely only on a frontend countdown timer.

The server should verify:

``` text
current_time < expires_at
```

The frontend countdown is only for user experience.

------------------------------------------------------------------------

# 9. Admin Code Screen

Example:

``` text
Generate Loyalty Code

[ Generate Code ]

Current Code

4827AB

Expires in:
04:32

Created:
10:30 AM

Status:
ACTIVE
```

After five minutes:

``` text
4827AB

Status:
EXPIRED
```

The admin can generate another code after the previous code expires.

------------------------------------------------------------------------

# 10. Customer Code Entry

After the customer makes a purchase, the customer asks the shopkeeper
for the current loyalty code.

Customer sees:

``` text
Enter Shop Code

Enter the code provided by the shopkeeper.

[ ______ ]

[ Verify Code ]
```

The customer enters:

``` text
4827AB
```

The server verifies:

1.  Customer is authenticated.
2.  Code exists.
3.  Code belongs to the current date/session rules.
4.  Code has not expired.
5.  Code has not already been used.
6.  Customer has not already received a checkpoint from that same code.
7.  Customer has fewer than six checkpoints in the current cycle.

If all conditions pass:

``` text
Code Valid ✓
```

Then the next loyalty checkpoint is completed.

------------------------------------------------------------------------

# 11. One Code = One Checkpoint Per Customer

A customer must not be able to reuse the same generated code.

Example:

``` text
Code: 4827AB

Customer A → Successful → +1 checkpoint
Customer A → Try again → Rejected

Customer B → Successful → +1 checkpoint
```

The same shop-generated code may be usable by multiple customers during
its five-minute lifetime, because multiple customers may make purchases
during that period.

However, each customer can use that code only once.

------------------------------------------------------------------------

# 12. Prevent Duplicate Check-ins

The backend should enforce uniqueness.

Recommended database rule:

``` text
UNIQUE(customer_id, code_id)
```

This prevents:

``` text
Customer → Same code → Multiple checkpoint increments
```

even if the customer sends multiple requests quickly.

This is important for preventing double-click/race-condition abuse.

------------------------------------------------------------------------

# 13. Six-Checkpoint Completion

When checkpoint 6 is successfully completed:

``` text
[ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ]
```

The customer unlocks the configured free dish.

Example:

``` text
🎉 Congratulations!

You've completed your loyalty card.

Your Free Dish:

[ IMAGE ]

Chicken Noodles

Show this screen to the shopkeeper.
```

------------------------------------------------------------------------

# 14. Free Dish / Reward Configuration

The admin should be able to configure the sixth reward.

Admin screen:

``` text
Free Dish Configuration

Dish Name
[ Chicken Noodles ]

Dish Image
[ Upload Image ]

[ Save Reward ]
```

The image should be uploaded to Supabase Storage.

Recommended storage path:

``` text
loyalty-rewards/
```

Example:

``` text
loyalty-rewards/chicken-noodles.webp
```

The database should store the image URL/path rather than the image
binary.

------------------------------------------------------------------------

# 15. Reward Display

After six successful checkpoints:

``` text
Your Reward 🎁

Chicken Noodles

[ Reward Image ]

FREE

Show this screen to the shopkeeper.
```

The reward should be tied to the customer's completed loyalty cycle.

------------------------------------------------------------------------

# 16. Loyalty Reset

After the customer completes all six checkpoints and receives the free
dish, the loyalty card should reset.

Before reset:

``` text
[ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ] [ ✓ ]

Reward Unlocked
```

After reward is claimed:

``` text
[ ○ ] [ ○ ] [ ○ ] [ ○ ] [ ○ ] [ ○ ]

0 / 6
```

The previous cycle should remain stored in the database for
history/reporting.

Do NOT simply delete the old records.

------------------------------------------------------------------------

# 17. Recommended Loyalty Cycle Model

Each customer should have loyalty cycles.

Example:

``` text
Customer
   │
   ├── Loyalty Cycle #1
   │      ├── Visit 1
   │      ├── Visit 2
   │      ├── Visit 3
   │      ├── Visit 4
   │      ├── Visit 5
   │      └── Visit 6 → Reward
   │
   ├── Loyalty Cycle #2
   │      ├── Visit 1
   │      └── ...
```

This allows the shop to maintain historical loyalty data.

------------------------------------------------------------------------

# 18. Admin Panel

## Dashboard

The admin dashboard should show:

``` text
Loyalty Dashboard

Total Customers       1,250
Active Codes             3
Completed Cards          86
Rewards Claimed          72
```

------------------------------------------------------------------------

# 19. Customer Management

Admin customer table:

  Name      Mobile Number      Progress   Cycle Last Visit   Status
  --------- ---------------- ---------- ------- ------------ --------
  Arun      +91 XXXXXXXX10          4/6      #3 Today        Active
  Priya     +91 XXXXXXXX22          6/6      #2 Today        Reward
  Karthik   +91 XXXXXXXX31          2/6      #1 Yesterday    Active

Features:

-   Search by name
-   Search by mobile number
-   View customer profile
-   View loyalty history
-   View current progress
-   View rewards earned

------------------------------------------------------------------------

# 20. Admin Code Generation

Recommended UI:

``` text
Loyalty Code

[ Generate New Code ]

Active Codes

Code      Created     Expires     Status
4827AB    10:30 AM    10:35 AM    ACTIVE
7194QX    10:20 AM    10:25 AM    EXPIRED
```

The code should be generated server-side using a cryptographically
secure random generator.

Do not generate security-sensitive codes only with:

``` text
Math.random()
```

------------------------------------------------------------------------

# 21. Admin Authentication

The Admin Panel must be protected.

Recommended:

``` text
Admin Login
     ↓
Supabase Auth
     ↓
Admin role check
     ↓
Admin Dashboard
```

A normal customer must never be able to access admin APIs simply by
changing the frontend URL.

Use Supabase Row Level Security (RLS) and server-side authorization.

------------------------------------------------------------------------

# 22. Database Design

Recommended Supabase PostgreSQL tables:

## profiles

Stores customer/admin profile information.

``` sql
profiles
--------
id UUID PRIMARY KEY
phone TEXT UNIQUE NOT NULL
name TEXT
role TEXT NOT NULL DEFAULT 'customer'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Roles:

``` text
customer
admin
```

------------------------------------------------------------------------

## loyalty_cycles

Stores each six-checkpoint cycle.

``` sql
loyalty_cycles
--------------
id UUID PRIMARY KEY
customer_id UUID NOT NULL
cycle_number INTEGER NOT NULL
completed_checkpoints INTEGER DEFAULT 0
status TEXT DEFAULT 'active'
reward_unlocked BOOLEAN DEFAULT FALSE
reward_claimed BOOLEAN DEFAULT FALSE
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
claimed_at TIMESTAMPTZ
```

Status examples:

``` text
active
completed
reward_claimed
```

------------------------------------------------------------------------

## loyalty_codes

Stores generated temporary codes.

``` sql
loyalty_codes
-------------
id UUID PRIMARY KEY
code TEXT NOT NULL
created_by UUID NOT NULL
created_at TIMESTAMPTZ NOT NULL
expires_at TIMESTAMPTZ NOT NULL
status TEXT DEFAULT 'active'
```

Recommended:

``` text
code + active time
```

should be indexed for fast validation.

------------------------------------------------------------------------

## loyalty_checkins

Stores each successful checkpoint.

``` sql
loyalty_checkins
----------------
id UUID PRIMARY KEY
customer_id UUID NOT NULL
cycle_id UUID NOT NULL
code_id UUID NOT NULL
checkpoint_number INTEGER NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

Important constraint:

``` sql
UNIQUE(customer_id, code_id)
```

This prevents one customer from using the same code more than once.

------------------------------------------------------------------------

## rewards

Stores the current reward configuration.

``` sql
rewards
-------
id UUID PRIMARY KEY
name TEXT NOT NULL
image_url TEXT
is_active BOOLEAN DEFAULT TRUE
updated_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

------------------------------------------------------------------------

# 23. Suggested Relationships

``` text
profiles
   │
   ├──────────────< loyalty_cycles
   │                       │
   │                       └──────────< loyalty_checkins
   │                                           │
   │                                           └── loyalty_codes
   │
   └── admin users

rewards
   │
   └── used when cycle reaches checkpoint 6
```

------------------------------------------------------------------------

# 24. API / Server Actions

Recommended backend operations.

## Customer

### Send OTP

``` text
POST /api/auth/send-otp
```

### Verify OTP

``` text
POST /api/auth/verify-otp
```

### Get Profile

``` text
GET /api/customer/profile
```

### Get Loyalty Card

``` text
GET /api/customer/loyalty
```

### Validate Code

``` text
POST /api/customer/loyalty/validate-code
```

Example request:

``` json
{
  "code": "4827AB"
}
```

Example success response:

``` json
{
  "success": true,
  "checkpoint": 4,
  "total": 6,
  "rewardUnlocked": false
}
```

------------------------------------------------------------------------

# 25. Admin APIs

### Get Customers

``` text
GET /api/admin/customers
```

### Generate Code

``` text
POST /api/admin/codes
```

Example response:

``` json
{
  "code": "4827AB",
  "expiresAt": "2026-10-06T10:35:00+05:30"
}
```

### Get Active Codes

``` text
GET /api/admin/codes
```

### Update Reward

``` text
PUT /api/admin/reward
```

### Upload Reward Image

``` text
POST /api/admin/reward/image
```

------------------------------------------------------------------------

# 26. Code Validation Algorithm

The validation should happen on the server.

Pseudo-flow:

``` text
Customer submits code
        ↓
Check authenticated user
        ↓
Find code in database
        ↓
Does code exist?
   ├── No → Reject
   └── Yes
        ↓
Check current time < expires_at
   ├── No → Reject: Code expired
   └── Yes
        ↓
Check customer already used this code
   ├── Yes → Reject: Code already used
   └── No
        ↓
Get customer's active loyalty cycle
        ↓
Check checkpoint count < 6
   ├── No → Handle completed/reward state
   └── Yes
        ↓
Create loyalty_checkin
        ↓
Increment checkpoint count
        ↓
If checkpoint = 6
        ↓
Unlock reward
        ↓
Return success
```

This entire operation should ideally be atomic using a PostgreSQL
transaction or Supabase RPC/database function.

------------------------------------------------------------------------

# 27. Race Condition Protection

The system must prevent two simultaneous requests from increasing the
same customer's progress twice.

Example attack:

``` text
Request 1 → code validation
Request 2 → same code validation
```

Both requests may arrive at almost exactly the same time.

Use:

-   Database unique constraints
-   PostgreSQL transactions
-   Server-side validation
-   Atomic checkpoint increment
-   Supabase RLS

The database should be the final authority.

------------------------------------------------------------------------

# 28. QR Code

Only one main QR code is required for the customer entry flow.

Example:

``` text
SCAN TO JOIN OUR LOYALTY PROGRAM

        █████████
        █ QR CODE █
        █████████

Scan → loyalty website
```

The QR can point to:

``` text
/loyalty
```

or:

``` text
/loyalty/start
```

------------------------------------------------------------------------

# 29. Next.js Application Structure

Recommended structure:

``` text
app/
├── (customer)/
│   └── loyalty/
│       ├── page.tsx
│       ├── verify/
│       │   └── page.tsx
│       └── profile/
│           └── page.tsx
│
├── admin/
│   ├── login/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── customers/
│   │   └── page.tsx
│   ├── codes/
│   │   └── page.tsx
│   └── reward/
│       └── page.tsx
│
├── api/
│   ├── auth/
│   ├── customer/
│   │   └── loyalty/
│   └── admin/
│       ├── codes/
│       └── reward/
│
components/
├── loyalty-card.tsx
├── checkpoint.tsx
├── code-input.tsx
├── otp-input.tsx
├── reward-card.tsx
├── admin-sidebar.tsx
└── customer-table.tsx

lib/
├── supabase/
├── auth/
├── loyalty/
└── validation/

types/
└── loyalty.ts
```

------------------------------------------------------------------------

# 30. UI Design

The customer interface should be mobile-first because customers will
primarily access it from their phones after scanning the QR code.

## Customer UI

Recommended screens:

1.  Welcome
2.  Mobile number
3.  OTP verification
4.  Profile
5.  Loyalty card
6.  Code entry
7.  Successful checkpoint
8.  Reward unlocked
9.  Reward claimed/reset

Example card:

``` text
┌───────────────────────────────┐
│         MY LOYALTY CARD       │
│                               │
│   ✓     ✓     ✓     ○     ○  ○│
│                               │
│           3 / 6               │
│                               │
│  Enter shop code after        │
│  your next purchase           │
│                               │
│       [ ENTER CODE ]          │
└───────────────────────────────┘
```

------------------------------------------------------------------------

# 31. Admin UI

Desktop-first admin dashboard.

Recommended sidebar:

``` text
Dashboard
Customers
Loyalty Codes
Reward
Settings
Logout
```

Dashboard cards:

``` text
Total Customers
Active Codes
Completed Cards
Rewards Claimed
```

------------------------------------------------------------------------

# 32. Security Requirements

The system must implement:

-   Supabase Auth
-   OTP authentication
-   Admin role authorization
-   Row Level Security
-   Server-side code validation
-   Five-minute server-side expiration
-   Secure random code generation
-   Duplicate code-use prevention
-   Rate limiting for OTP requests
-   Rate limiting for code validation
-   Input validation
-   Protected admin routes
-   No service-role key exposed to the browser

Never expose:

``` text
SUPABASE_SERVICE_ROLE_KEY
```

to client-side JavaScript.

------------------------------------------------------------------------

# 33. Recommended Environment Variables

``` env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Only the service-role key should be available to trusted server-side
code.

------------------------------------------------------------------------

# 34. Important Business Rules

### Rule 1 --- OTP Required

A customer must verify their mobile number before using the loyalty
system.

### Rule 2 --- One Profile Per Mobile Number

The same mobile number should map to one customer profile.

### Rule 3 --- Six Checkpoints

Every loyalty cycle has exactly six checkpoints.

### Rule 4 --- Admin Generates Codes

Customers cannot generate their own loyalty codes.

### Rule 5 --- Five-Minute Expiry

Every generated code expires after five minutes.

### Rule 6 --- Same Code Cannot Be Reused by the Same Customer

A customer can only receive one checkpoint from a specific code.

### Rule 7 --- Code Can Serve Multiple Customers

The same active shop code can be used by different customers during its
five-minute validity period.

### Rule 8 --- Sixth Checkpoint Unlocks Reward

Checkpoint six unlocks the configured free dish.

### Rule 9 --- Reward Configuration

Admin can upload the reward image and set the reward name.

### Rule 10 --- Reset After Reward

Once the sixth reward is claimed, the customer's card starts a new
six-checkpoint cycle.

------------------------------------------------------------------------

# 35. Recommended Improvements

## Customer Name Collection

After OTP verification, if the customer is new:

``` text
What's your name?

[ Enter your name ]

[ Continue ]
```

If the customer already exists, skip this step.

------------------------------------------------------------------------

## Reward Claim Confirmation

After completing six checkpoints, the shopkeeper should confirm that the
free dish was actually given.

Recommended flow:

``` text
Customer completes checkpoint 6
        ↓
Reward unlocked
        ↓
Customer shows reward screen
        ↓
Shopkeeper confirms/claims reward
        ↓
Cycle marked reward_claimed
        ↓
New cycle starts
```

This is safer than resetting immediately when checkpoint six is
completed.

------------------------------------------------------------------------

# 36. Recommended End-to-End Flow

``` text
                 CUSTOMER
                    │
                    ▼
              Scan QR Code
                    │
                    ▼
             Loyalty Website
                    │
                    ▼
             Enter Mobile No.
                    │
                    ▼
               Send OTP
                    │
                    ▼
              Verify OTP
                    │
                    ▼
           Create / Load Profile
                    │
                    ▼
             Loyalty Card
                    │
                    │
          Customer makes purchase
                    │
                    ▼
        Ask shopkeeper for code
                    │
                    ▼
            Enter 6-char code
                    │
                    ▼
          Server validates code
                    │
             ┌──────┴──────┐
             │             │
           Invalid        Valid
             │             │
             ▼             ▼
           Reject       +1 Checkpoint
                           │
                           ▼
                    Is it checkpoint 6?
                       │          │
                      No         Yes
                       │          │
                       ▼          ▼
                 Continue      Reward
                               Unlocked
                                  │
                                  ▼
                             Claim Reward
                                  │
                                  ▼
                            Reset Cycle
                                  │
                                  ▼
                              0 / 6
```

------------------------------------------------------------------------

# 37. Admin Flow

``` text
Admin Login
    │
    ▼
Dashboard
    │
    ├── Customers
    │      └── View customer name/mobile/progress
    │
    ├── Generate Code
    │      └── Code valid for 5 minutes
    │
    ├── Loyalty History
    │
    └── Reward Settings
           ├── Upload image
           └── Set free dish name
```

------------------------------------------------------------------------

# 38. MVP Scope

The first version should include:

### Customer

-   QR landing page
-   Mobile number entry
-   OTP verification
-   Profile creation
-   Loyalty card
-   Six checkpoints
-   Code entry
-   Code validation
-   Reward display
-   Loyalty reset

### Admin

-   Admin authentication
-   Dashboard
-   Customer list
-   Customer search
-   Code generation
-   Five-minute expiration
-   Active/expired code status
-   Reward name configuration
-   Reward image upload
-   Loyalty history

------------------------------------------------------------------------

# 39. Future Features

Possible future improvements:

-   WhatsApp notifications
-   Birthday rewards
-   Customer purchase history
-   Multiple reward tiers
-   Different loyalty cards
-   Branch/location support
-   Multiple admins
-   Analytics
-   Customer segmentation
-   Push notifications
-   Referral rewards
-   Promotional coupons
-   QR codes per branch
-   Staff accounts
-   Redemption verification PIN
-   Export customer data
-   Revenue/loyalty analytics

------------------------------------------------------------------------

# 40. Final Recommended Architecture

``` text
                    ┌─────────────────────┐
                    │      Customer       │
                    │      Mobile Web     │
                    └──────────┬──────────┘
                               │
                             QR Code
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Next.js        │
                    │   Customer Panel    │
                    └──────────┬──────────┘
                               │
                         Supabase Auth
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Supabase Database  │
                    │     PostgreSQL      │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
         Profiles       Loyalty Cycles    Loyalty Codes
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Admin Panel      │
                    │      Next.js        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Supabase Storage  │
                    │    Reward Images    │
                    └─────────────────────┘
```

## Final Product Concept

The system is essentially a **digital six-visit loyalty card**.

The customer:

**Scan QR → Mobile → OTP → Profile → Purchase → Enter Shop Code →
Checkpoint → Repeat 6 times → Free Dish → New Card**

The shopkeeper:

**Login → Generate temporary code → Customer enters code → System
validates → Customer gets checkpoint**

The critical security principle is:

> **The frontend displays the loyalty experience, but
> Supabase/PostgreSQL is the source of truth for authentication, code
> expiry, checkpoint increments, duplicate prevention, rewards, and
> loyalty history.**
