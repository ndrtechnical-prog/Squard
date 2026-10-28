# Google Sheets Database Setup Guide

**Target Spreadsheet ID:** `1k0vMHvXIAumbG-Fa8ud-tkaYoleCOc5FRhuA-gKVNMA`

This project connects to Google Sheets via Google Apps Script as the secure, authenticated backend.

---

### Step 1: Open Google Sheets & Apps Script
1. Open your Google Sheet in your browser:
   `https://docs.google.com/spreadsheets/d/1k0vMHvXIAumbG-Fa8ud-tkaYoleCOc5FRhuA-gKVNMA/edit`
2. In the top menu, click **Extensions** > **Apps Script**.

### Step 2: Paste the Apps Script Code
1. Delete any sample code in the editor (`function myFunction() {...}`).
2. Copy the entire contents of `google-apps-script/Code.gs` from this project and paste it into the editor.
3. Save the script (Ctrl+S or click the disk icon).

### Step 3: Run Initial Setup
1. In the toolbar, select `initSheets` from the function dropdown.
2. Click **Run**.
3. Authorize Google permissions if prompted (Click *Advanced* > *Go to Untitled project (unsafe)* > *Allow*).
4. This creates the 4 required tabs automatically:
   - **TeamSlots** (Columns: `Match ID`, `Match Date`, `Team Number`, `Slot Number`, `PUBG UID`, `Player Name`, `Reservation ID`, `Booking Date`, `Payment Status`, `Slot Status`, `Total Joins`)
   - **PlayerHistory** (Columns: `PUBG UID`, `Player Name`, `Match ID`, `Match Date`, `Team Number`, `Slot Number`, `Booking Date`, `Payment Status`, `Reservation ID`, `Reward Per Kill`, `Kills`, `Total Reward`)
   - **Matches** (Columns: `Match ID`, `Match Date`, `Match Status`, `Total Teams`, `Total Slots`, `Occupied Slots`, `Empty Slots`)
   - **AdminAuditLog** (Columns: `Timestamp`, `Action`, `Previous Value`, `New Value`, `Admin Identity`)

### Step 4: Deploy as Web App
1. At the top right, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Fill in settings:
   - **Description**: `PUBG Tournament Slots API`
   - **Execute as**: `Me (your Google account)`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. Copy the **Web App URL** (looks like: `https://script.google.com/macros/s/AKfycbx.../exec`).

### Step 5: Add Web App URL to Your Environment
In your `.env` file or hosting environment variables:
```env
GOOGLE_SHEETS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```
The website backend will automatically sync all 25 teams (100 slots), booking submissions, slot modifications, and UID searches directly with your Google Sheet!
