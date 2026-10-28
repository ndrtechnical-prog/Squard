/**
 * Google Apps Script for PUBG Tournament Website
 * Spreadsheet ID: 1k0vMHvXIAumbG-Fa8ud-tkaYoleCOc5FRhuA-gKVNMA
 * 
 * Instructions:
 * 1. Open Google Sheets: https://docs.google.com/spreadsheets/d/1k0vMHvXIAumbG-Fa8ud-tkaYoleCOc5FRhuA-gKVNMA/edit
 * 2. Extensions > Apps Script
 * 3. Replace default code with this file.
 * 4. Run `initSheets()` once to create all tabs and headers.
 * 5. Click Deploy > New deployment > Web app:
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 6. Copy the Web App URL and set in your .env or server environment as GOOGLE_SHEETS_SCRIPT_URL.
 */

const SPREADSHEET_ID = '1k0vMHvXIAumbG-Fa8ud-tkaYoleCOc5FRhuA-gKVNMA';

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== '') {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Initialize all required tabs and column headers without erasing existing data
 */
function initSheets() {
  const ss = getSpreadsheet();
  
  // 1. TeamSlots
  let teamSlotsSheet = ss.getSheetByName('TeamSlots');
  if (!teamSlotsSheet) {
    teamSlotsSheet = ss.insertSheet('TeamSlots');
  }
  if (teamSlotsSheet.getLastRow() === 0) {
    teamSlotsSheet.appendRow([
      'Match ID', 'Match Date', 'Team Number', 'Slot Number', 
      'PUBG UID', 'Player Name', 'Reservation ID', 'Booking Date', 
      'Payment Status', 'Slot Status', 'Total Joins'
    ]);
    teamSlotsSheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#0f172a').setFontColor('#38bdf8');
  }

  // 2. PlayerHistory
  let playerHistorySheet = ss.getSheetByName('PlayerHistory');
  if (!playerHistorySheet) {
    playerHistorySheet = ss.insertSheet('PlayerHistory');
  }
  if (playerHistorySheet.getLastRow() === 0) {
    playerHistorySheet.appendRow([
      'PUBG UID', 'Player Name', 'Match ID', 'Match Date', 
      'Team Number', 'Slot Number', 'Booking Date', 'Payment Status', 
      'Reservation ID', 'Reward Per Kill', 'Kills', 'Total Reward'
    ]);
    playerHistorySheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#0f172a').setFontColor('#f59e0b');
  }

  // 3. Matches
  let matchesSheet = ss.getSheetByName('Matches');
  if (!matchesSheet) {
    matchesSheet = ss.insertSheet('Matches');
  }
  if (matchesSheet.getLastRow() === 0) {
    matchesSheet.appendRow([
      'Match ID', 'Match Date', 'Match Status', 
      'Total Teams', 'Total Slots', 'Occupied Slots', 'Empty Slots'
    ]);
    matchesSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#0f172a').setFontColor('#10b981');
  }

  // 4. AdminAuditLog
  let auditSheet = ss.getSheetByName('AdminAuditLog');
  if (!auditSheet) {
    auditSheet = ss.insertSheet('AdminAuditLog');
  }
  if (auditSheet.getLastRow() === 0) {
    auditSheet.appendRow([
      'Timestamp', 'Action', 'Previous Value', 'New Value', 'Admin Identity'
    ]);
    auditSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#0f172a').setFontColor('#e2e8f0');
  }

  return { success: true, message: 'All 4 tabs verified and initialized.' };
}

/**
 * Handle GET requests
 */
function doGet(e) {
  const action = e.parameter.action || 'status';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = getSpreadsheet();
    
    if (action === 'status') {
      return jsonResponse({
        success: true,
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        sheets: ss.getSheets().map(s => s.getName())
      });
    }

    if (action === 'searchUid') {
      const uid = (e.parameter.uid || '').trim();
      const result = searchPlayerByUid(ss, uid);
      return jsonResponse(result);
    }

    if (action === 'getSlots') {
      const matchId = (e.parameter.matchId || 'PUBG-M-2026-10-22').trim();
      const slots = getSlotsForMatch(ss, matchId);
      return jsonResponse({ success: true, matchId, slots });
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = getSpreadsheet();

    if (action === 'init') {
      const result = initSheets();
      return jsonResponse(result);
    }

    if (action === 'syncSlots') {
      const matchId = data.matchId;
      const matchDate = data.matchDate || new Date().toISOString();
      const slots = data.slots || []; // array of 100 slots

      const result = syncSlotsBatch(ss, matchId, matchDate, slots);
      return jsonResponse(result);
    }

    if (action === 'updateSingleSlot') {
      const { matchId, teamNumber, slotNumber, pubgUid, playerName, slotStatus, paymentStatus, reservationId, adminIdentity } = data;
      const result = updateSlotRecord(ss, matchId, teamNumber, slotNumber, {
        pubgUid,
        playerName,
        slotStatus,
        paymentStatus,
        reservationId
      }, adminIdentity);
      return jsonResponse(result);
    }

    if (action === 'logAudit') {
      const { logAction, previousValue, newValue, adminIdentity } = data;
      appendAuditLog(ss, logAction, previousValue, newValue, adminIdentity);
      return jsonResponse({ success: true });
    }

    if (action === 'searchUid') {
      const uid = (data.uid || '').trim();
      const result = searchPlayerByUid(ss, uid);
      return jsonResponse(result);
    }

    return jsonResponse({ success: false, error: 'Unsupported POST action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Search player history and compute distinct total joins
 */
function searchPlayerByUid(ss, uid) {
  if (!uid) {
    return { success: false, error: 'UID is required' };
  }

  const cleanUid = String(uid).trim();
  const historySheet = ss.getSheetByName('PlayerHistory');
  const slotsSheet = ss.getSheetByName('TeamSlots');

  const history = [];
  const distinctMatches = new Set();
  const teamsPlayed = new Set();
  let playerName = '';

  // Check PlayerHistory tab
  if (historySheet && historySheet.getLastRow() > 1) {
    const data = historySheet.getRange(2, 1, historySheet.getLastRow() - 1, 12).getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (String(row[0]).trim() === cleanUid) {
        if (!playerName && row[1]) playerName = String(row[1]);
        const mId = String(row[2]);
        distinctMatches.add(mId);
        teamsPlayed.add(Number(row[4]));

        history.push({
          pubgUid: cleanUid,
          playerName: String(row[1]),
          matchId: mId,
          matchDate: String(row[3]),
          teamNumber: Number(row[4]),
          slotNumber: Number(row[5]),
          bookingDate: String(row[6]),
          paymentStatus: String(row[7]),
          reservationId: String(row[8]),
          rewardPerKill: Number(row[9] || 0),
          kills: Number(row[10] || 0),
          totalReward: Number(row[11] || 0),
          slotStatus: 'Confirmed'
        });
      }
    }
  }

  // Check current TeamSlots tab for active reservations
  if (slotsSheet && slotsSheet.getLastRow() > 1) {
    const slotData = slotsSheet.getRange(2, 1, slotsSheet.getLastRow() - 1, 11).getValues();
    for (let j = 0; j < slotData.length; j++) {
      const row = slotData[j];
      if (String(row[4]).trim() === cleanUid) {
        if (!playerName && row[5]) playerName = String(row[5]);
        const mId = String(row[0]);
        const sStatus = String(row[9]);
        if (sStatus === 'Confirmed') {
          distinctMatches.add(mId);
        }
        teamsPlayed.add(Number(row[2]));

        // Check if not already in history
        const exists = history.some(h => h.matchId === mId && h.teamNumber === Number(row[2]) && h.slotNumber === Number(row[3]));
        if (!exists) {
          history.push({
            pubgUid: cleanUid,
            playerName: String(row[5]),
            matchId: mId,
            matchDate: String(row[1]),
            teamNumber: Number(row[2]),
            slotNumber: Number(row[3]),
            bookingDate: String(row[7]),
            paymentStatus: String(row[8]),
            reservationId: String(row[6]),
            slotStatus: sStatus,
            rewardPerKill: 0,
            kills: 0,
            totalReward: 0
          });
        }
      }
    }
  }

  if (history.length === 0) {
    return {
      success: true,
      found: false,
      message: 'No joining history found for this PUBG UID.'
    };
  }

  return {
    success: true,
    found: true,
    pubgUid: cleanUid,
    playerName: playerName || `Player_${cleanUid.slice(-4)}`,
    totalJoining: distinctMatches.size,
    totalReservations: history.length,
    teamsPlayed: Array.from(teamsPlayed).sort((a, b) => a - b),
    history: history
  };
}

/**
 * Batch synchronize all 100 slots for a match into TeamSlots and update Matches tab
 */
function syncSlotsBatch(ss, matchId, matchDate, slots) {
  initSheets();
  const sheet = ss.getSheetByName('TeamSlots');
  
  // Read existing rows to find rows for this matchId
  let lastRow = sheet.getLastRow();
  let existingData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 11).getValues() : [];
  
  // Map of "team-slot" -> rowIndex in existingData
  const rowMap = {};
  for (let i = 0; i < existingData.length; i++) {
    if (existingData[i][0] === matchId) {
      const key = `${existingData[i][2]}-${existingData[i][3]}`;
      rowMap[key] = i + 2; // 1-indexed row in sheet
    }
  }

  let occupiedCount = 0;
  const rowsToAppend = [];
  const updates = [];

  for (let t = 1; t <= 25; t++) {
    for (let s = 1; s <= 4; s++) {
      const key = `${t}-${s}`;
      const slot = slots.find(item => item.teamNumber === t && item.slotNumber === s) || {};
      
      const status = slot.slotStatus || (slot.pubgUid ? 'Confirmed' : 'Empty');
      const isOccupied = status === 'Confirmed' || status === 'Pending';
      if (isOccupied) occupiedCount++;

      const rowValues = [
        matchId,
        matchDate,
        t,
        s,
        slot.pubgUid || '',
        slot.playerName || '',
        slot.reservationId || '',
        slot.bookingDate || '',
        slot.paymentStatus || '',
        status,
        slot.totalJoins || 0
      ];

      if (rowMap[key]) {
        updates.push({ rowNumber: rowMap[key], values: rowValues });
      } else {
        rowsToAppend.push(rowValues);
      }
    }
  }

  // Apply updates
  for (let u of updates) {
    sheet.getRange(u.rowNumber, 1, 1, 11).setValues([u.values]);
  }

  // Apply appends
  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, 11).setValues(rowsToAppend);
  }

  // Update Matches tab
  updateMatchSummary(ss, matchId, matchDate, occupiedCount);

  return {
    success: true,
    matchId,
    totalTeams: 25,
    totalSlots: 100,
    occupiedSlots: occupiedCount,
    emptySlots: 100 - occupiedCount
  };
}

/**
 * Update Matches tab with calculated occupied and empty slots
 */
function updateMatchSummary(ss, matchId, matchDate, occupiedCount) {
  const matchesSheet = ss.getSheetByName('Matches');
  if (!matchesSheet) return;

  const lastRow = matchesSheet.getLastRow();
  let foundRow = -1;

  if (lastRow > 1) {
    const data = matchesSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === matchId) {
        foundRow = i + 2;
        break;
      }
    }
  }

  const rowValues = [
    matchId,
    matchDate,
    'REGISTRATION_OPEN',
    25,
    100,
    occupiedCount,
    100 - occupiedCount
  ];

  if (foundRow > 0) {
    matchesSheet.getRange(foundRow, 1, 1, 7).setValues([rowValues]);
  } else {
    matchesSheet.appendRow(rowValues);
  }
}

/**
 * Update a single slot in TeamSlots and log to AdminAuditLog
 */
function updateSlotRecord(ss, matchId, teamNumber, slotNumber, slotData, adminIdentity) {
  const sheet = ss.getSheetByName('TeamSlots');
  if (!sheet) return { success: false, error: 'TeamSlots sheet missing' };

  let targetRow = -1;
  let previousValue = 'Empty';

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === matchId && Number(data[i][2]) === teamNumber && Number(data[i][3]) === slotNumber) {
        targetRow = i + 2;
        previousValue = `UID:${data[i][4] || 'null'} | Name:${data[i][5] || 'null'} | Status:${data[i][9]}`;
        break;
      }
    }
  }

  const newValue = `UID:${slotData.pubgUid || 'null'} | Name:${slotData.playerName || 'null'} | Status:${slotData.slotStatus}`;

  const rowValues = [
    matchId,
    new Date().toISOString(),
    teamNumber,
    slotNumber,
    slotData.pubgUid || '',
    slotData.playerName || '',
    slotData.reservationId || '',
    new Date().toLocaleString(),
    slotData.paymentStatus || '',
    slotData.slotStatus || 'Empty',
    0
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, 11).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  // If confirmed, also add to PlayerHistory
  if (slotData.slotStatus === 'Confirmed' && slotData.pubgUid) {
    const phSheet = ss.getSheetByName('PlayerHistory');
    if (phSheet) {
      phSheet.appendRow([
        slotData.pubgUid,
        slotData.playerName || '',
        matchId,
        new Date().toISOString().split('T')[0],
        teamNumber,
        slotNumber,
        new Date().toLocaleString(),
        slotData.paymentStatus || 'Approved',
        slotData.reservationId || `res_${Date.now()}`,
        100, // Reward per kill (PKR / Diamonds)
        0,   // Initial kills
        0    // Initial reward
      ]);
    }
  }

  appendAuditLog(
    ss, 
    `Slot Update: Team ${teamNumber} Slot ${slotNumber}`, 
    previousValue, 
    newValue, 
    adminIdentity || 'Admin'
  );

  return { success: true, matchId, teamNumber, slotNumber, slotStatus: slotData.slotStatus };
}

/**
 * Append entry to AdminAuditLog tab
 */
function appendAuditLog(ss, action, previousValue, newValue, adminIdentity) {
  const auditSheet = ss.getSheetByName('AdminAuditLog');
  if (!auditSheet) return;

  auditSheet.appendRow([
    new Date().toISOString(),
    action,
    previousValue || '',
    newValue || '',
    adminIdentity || 'Tournament Administrator'
  ]);
}
