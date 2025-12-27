# Black Box Testing Report - LiveRouteTracker & Booking System

## Test Plan Overview
Testing the LiveRouteTracker component and booking flow from a user's perspective without examining internal implementation details.

## Test Scenarios

### 1. Provider Map Access Tests
**Test Case 1.1: Provider can view map for scheduled booking (any time)**
- **Precondition**: Provider has a booking with status 'scheduled' or 'accepted'
- **Action**: Provider clicks "View Map" button
- **Expected Result**: Map opens immediately, no time restriction message
- **Status**: ⏳ To Test

**Test Case 1.2: Provider can view map before 30 minutes of scheduled time**
- **Precondition**: Booking scheduled for 2 hours from now, status 'scheduled'
- **Action**: Provider clicks "View Map"
- **Expected Result**: Map opens successfully
- **Status**: ⏳ To Test

**Test Case 1.3: Provider cannot see OTP display**
- **Precondition**: Provider has arrived at doorstep (distance ≤ 10m), OTP generated
- **Action**: Provider views map
- **Expected Result**: No OTP card displayed, only map and route info
- **Status**: ⏳ To Test

### 2. Customer Map Access Tests
**Test Case 2.1: Customer can view map within 30 minutes of scheduled time**
- **Precondition**: Booking scheduled in 20 minutes, status 'accepted'
- **Action**: Customer clicks "Track Service"
- **Expected Result**: Map opens successfully
- **Status**: ⏳ To Test

**Test Case 2.2: Customer cannot view map more than 30 minutes before scheduled time**
- **Precondition**: Booking scheduled in 2 hours, status 'accepted'
- **Action**: Customer clicks "Track Service"
- **Expected Result**: Error message: "Map viewing will be available 30 minutes before your scheduled time..."
- **Status**: ⏳ To Test

**Test Case 2.3: Customer sees OTP when provider arrives**
- **Precondition**: Provider arrives at doorstep (distance ≤ 10m)
- **Action**: Customer views map
- **Expected Result**: Green OTP card displayed with 6-digit OTP
- **Status**: ⏳ To Test

### 3. OTP Generation Tests
**Test Case 3.1: OTP generated when provider reaches doorstep (0.01km)**
- **Precondition**: Provider location within 10 meters of customer location
- **Action**: System calculates distance
- **Expected Result**: OTP automatically generated, status changes to 'arrived'
- **Status**: ⏳ To Test

**Test Case 3.2: OTP not generated when provider is far away**
- **Precondition**: Provider location > 10 meters from customer
- **Action**: System calculates distance
- **Expected Result**: No OTP generated, status remains 'accepted' or 'scheduled'
- **Status**: ⏳ To Test

**Test Case 3.3: OTP only generated once**
- **Precondition**: Provider arrives, OTP already generated
- **Action**: Provider moves away and comes back
- **Expected Result**: OTP not regenerated (prevents duplicate OTPs)
- **Status**: ⏳ To Test

### 4. Status-Based Restrictions Tests
**Test Case 4.1: Pending booking - map blocked**
- **Precondition**: Booking status is 'pending'
- **Action**: User/Provider tries to view map
- **Expected Result**: Error: "Waiting for provider to accept your booking request"
- **Status**: ⏳ To Test

**Test Case 4.2: Rejected booking - map blocked**
- **Precondition**: Booking status is 'rejected'
- **Action**: User/Provider tries to view map
- **Expected Result**: Error: "This booking has been rejected by the provider"
- **Status**: ⏳ To Test

**Test Case 4.3: Completed booking - map blocked**
- **Precondition**: Booking status is 'completed'
- **Action**: User/Provider tries to view map
- **Expected Result**: Error: "This service has already been completed"
- **Status**: ⏳ To Test

**Test Case 4.4: In-progress booking - map accessible**
- **Precondition**: Booking status is 'in-progress'
- **Action**: User/Provider views map
- **Expected Result**: Map opens successfully (no time restrictions)
- **Status**: ⏳ To Test

**Test Case 4.5: Arrived booking - map accessible**
- **Precondition**: Booking status is 'arrived'
- **Action**: User/Provider views map
- **Expected Result**: Map opens successfully
- **Status**: ⏳ To Test

### 5. Time Calculation Tests
**Test Case 5.1: Exactly 30 minutes before - map accessible**
- **Precondition**: Current time is exactly 30 minutes before scheduled time
- **Action**: Customer tries to view map
- **Expected Result**: Map opens successfully
- **Status**: ⏳ To Test

**Test Case 5.2: 29 minutes before - map accessible**
- **Precondition**: Current time is 29 minutes before scheduled time
- **Action**: Customer tries to view map
- **Expected Result**: Map opens successfully
- **Status**: ⏳ To Test

**Test Case 5.3: 31 minutes before - map blocked**
- **Precondition**: Current time is 31 minutes before scheduled time
- **Action**: Customer tries to view map
- **Expected Result**: Error message with countdown
- **Status**: ⏳ To Test

### 6. Map Functionality Tests
**Test Case 6.1: Route calculation displays correctly**
- **Precondition**: Provider and customer locations are set
- **Action**: Map loads
- **Expected Result**: Route line displayed between provider and customer, distance and ETA shown
- **Status**: ⏳ To Test

**Test Case 6.2: Real-time location updates**
- **Precondition**: Provider location is being tracked
- **Action**: Provider moves, location updates
- **Expected Result**: Provider marker moves on map, route recalculates
- **Status**: ⏳ To Test

**Test Case 6.3: Map markers display correctly**
- **Precondition**: Map is open
- **Action**: View map
- **Expected Result**: Customer location marker (red) and provider marker (blue) visible
- **Status**: ⏳ To Test

### 7. Edge Cases
**Test Case 7.1: No scheduled time - map accessible**
- **Precondition**: Booking has no booking_date or booking_time
- **Action**: User/Provider tries to view map
- **Expected Result**: Map opens (no time restriction applied)
- **Status**: ⏳ To Test

**Test Case 7.2: Invalid date format - map accessible**
- **Precondition**: Booking has invalid date format
- **Action**: User/Provider tries to view map
- **Expected Result**: Map opens (graceful fallback)
- **Status**: ⏳ To Test

**Test Case 7.3: Provider location not available**
- **Precondition**: Provider hasn't shared location yet
- **Action**: Customer views map
- **Expected Result**: Customer location shown, message "Waiting for provider location..."
- **Status**: ⏳ To Test

## Test Execution Log

### Test Run 1: Date: [Current Date]
- **Environment**: Development
- **Tester**: Automated Test Suite
- **Results**: To be executed

---

## Test Results Summary
- **Total Test Cases**: 23
- **Passed**: 0
- **Failed**: 0
- **Pending**: 23
- **Blocked**: 0

## Notes
- All tests should be executed from user interface perspective
- No code inspection required for black box testing
- Focus on observable behavior and outputs

