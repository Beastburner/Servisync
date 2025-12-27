# Manual Black Box Testing Checklist

## Pre-Test Setup
- [ ] Application is running (npm run dev)
- [ ] Firebase/Firestore is connected
- [ ] Test user account (customer) is logged in
- [ ] Test provider account is logged in
- [ ] Browser console is open for debugging

---

## Test Group 1: Provider Map Access

### Test 1.1: Provider views map for scheduled booking
**Steps:**
1. Log in as provider
2. Navigate to Provider Dashboard → Jobs tab
3. Find a booking with status 'scheduled' or 'accepted'
4. Click "View Map" button

**Expected Result:**
- [ ] Map opens immediately
- [ ] No time restriction message appears
- [ ] Provider location and customer location are visible
- [ ] Route is displayed between locations

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.2: Provider views map before 30 minutes
**Steps:**
1. Log in as provider
2. Create/find booking scheduled 2+ hours from now
3. Click "View Map" button

**Expected Result:**
- [ ] Map opens successfully
- [ ] No time restriction error

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 1.3: Provider does not see OTP display
**Steps:**
1. Log in as provider
2. Open map for a booking
3. Simulate provider arriving at doorstep (distance ≤ 10m)
4. Check if OTP card appears

**Expected Result:**
- [ ] OTP card does NOT appear for provider
- [ ] Map shows route and location info only
- [ ] Status shows "You have arrived at customer location"

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Group 2: Customer Map Access

### Test 2.1: Customer views map within 30 minutes
**Steps:**
1. Log in as customer
2. Navigate to User Dashboard
3. Find booking scheduled in 20 minutes
4. Click "Track Service" button

**Expected Result:**
- [ ] Map opens successfully
- [ ] No time restriction message
- [ ] Provider and customer locations visible

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 2.2: Customer blocked before 30 minutes
**Steps:**
1. Log in as customer
2. Find booking scheduled 2+ hours from now
3. Click "Track Service" button

**Expected Result:**
- [ ] Error message appears: "Map viewing will be available 30 minutes before..."
- [ ] Map does NOT open
- [ ] Shows countdown time remaining

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 2.3: Customer sees OTP when provider arrives
**Steps:**
1. Log in as customer
2. Open map for active booking
3. Wait for provider to arrive (or simulate arrival)
4. Check for OTP display

**Expected Result:**
- [ ] Green OTP card appears
- [ ] Shows "Provider Has Arrived!" message
- [ ] Displays 6-digit OTP
- [ ] Status changes to "arrived"

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Group 3: OTP Generation

### Test 3.1: OTP generated at doorstep (0.01km)
**Steps:**
1. Provider opens map
2. Provider location is set to within 10 meters of customer
3. System calculates distance

**Expected Result:**
- [ ] OTP is automatically generated
- [ ] Booking status changes to 'arrived'
- [ ] Customer sees OTP on their map
- [ ] Console shows "✅ OTP generated successfully"

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 3.2: OTP not generated when far away
**Steps:**
1. Provider location is > 10 meters from customer
2. System calculates distance

**Expected Result:**
- [ ] No OTP generated
- [ ] Status remains 'accepted' or 'scheduled'
- [ ] Console shows distance but no OTP generation

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 3.3: OTP generated only once
**Steps:**
1. Provider arrives, OTP generated
2. Provider moves away
3. Provider comes back to doorstep

**Expected Result:**
- [ ] OTP not regenerated
- [ ] Original OTP remains valid
- [ ] Console shows OTP already generated message

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Group 4: Status-Based Restrictions

### Test 4.1: Pending booking blocks map
**Steps:**
1. Find booking with status 'pending'
2. Try to open map (as user or provider)

**Expected Result:**
- [ ] Error: "Waiting for provider to accept your booking request"
- [ ] Map does NOT open

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 4.2: Rejected booking blocks map
**Steps:**
1. Find booking with status 'rejected'
2. Try to open map

**Expected Result:**
- [ ] Error: "This booking has been rejected by the provider"
- [ ] Map does NOT open

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 4.3: Completed booking blocks map
**Steps:**
1. Find booking with status 'completed'
2. Try to open map (as user or provider)

**Expected Result:**
- [ ] Error: "This service has already been completed"
- [ ] Map does NOT open

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 4.4: In-progress booking allows map
**Steps:**
1. Find booking with status 'in-progress'
2. Open map

**Expected Result:**
- [ ] Map opens successfully
- [ ] No time restrictions applied
- [ ] Both user and provider can view

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 4.5: Arrived booking allows map
**Steps:**
1. Find booking with status 'arrived'
2. Open map

**Expected Result:**
- [ ] Map opens successfully
- [ ] OTP visible to customer (if not provider)

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Group 5: Time Calculation

### Test 5.1: Exactly 30 minutes before - map accessible
**Steps:**
1. Create booking exactly 30 minutes from now
2. Customer tries to view map

**Expected Result:**
- [ ] Map opens (30 minutes is allowed)

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 5.2: 29 minutes before - map accessible
**Steps:**
1. Create booking 29 minutes from now
2. Customer tries to view map

**Expected Result:**
- [ ] Map opens

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 5.3: 31 minutes before - map blocked
**Steps:**
1. Create booking 31 minutes from now
2. Customer tries to view map

**Expected Result:**
- [ ] Map blocked with countdown message

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Group 6: Map Functionality

### Test 6.1: Route calculation displays
**Steps:**
1. Open map with provider and customer locations set
2. Observe route display

**Expected Result:**
- [ ] Route line visible between locations
- [ ] Distance shown (e.g., "2.5 km")
- [ ] ETA shown (e.g., "15 mins")
- [ ] Traffic indicator shown

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 6.2: Real-time location updates
**Steps:**
1. Provider shares location
2. Provider moves to new location
3. Observe map updates

**Expected Result:**
- [ ] Provider marker moves on map
- [ ] Route recalculates
- [ ] Distance and ETA update
- [ ] Updates every 10 seconds

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 6.3: Map markers display
**Steps:**
1. Open map
2. Check for markers

**Expected Result:**
- [ ] Customer location marker (red/home icon) visible
- [ ] Provider location marker (blue/person icon) visible
- [ ] Markers have popups with location info

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Group 7: Edge Cases

### Test 7.1: No scheduled time
**Steps:**
1. Create booking without booking_date or booking_time
2. Try to open map

**Expected Result:**
- [ ] Map opens (no time restriction)
- [ ] No error message

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 7.2: Invalid date format
**Steps:**
1. Create booking with invalid date format
2. Try to open map

**Expected Result:**
- [ ] Map opens (graceful fallback)
- [ ] No crash or error

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

### Test 7.3: Provider location unavailable
**Steps:**
1. Customer opens map
2. Provider hasn't shared location yet

**Expected Result:**
- [ ] Customer location shown
- [ ] Message: "Waiting for provider location..."
- [ ] No crash

**Actual Result:** _______________________

**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked

---

## Test Summary

**Total Tests:** 23
**Passed:** ___
**Failed:** ___
**Blocked:** ___

**Test Date:** ___________
**Tester Name:** ___________
**Environment:** Development / Production

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

