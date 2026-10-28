import { Env, EventContext } from './types';

export const onRequestPost = async (context: EventContext<Env>) => {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Cloudflare D1 database binding (DB) is missing.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body: any = await request.json();
    const {
      tournamentId,
      teamNumber,
      seatNumbers,
      packageType,
      playerName,
      playerUid,
      contactNumber,
      paymentMethod,
      transactionRef,
      screenshotBase64,
      screenshotMime
    } = body;

    if (!tournamentId || !teamNumber || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required tournament or seat parameters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!transactionRef?.trim()) {
      return new Response(JSON.stringify({ error: 'Transaction reference (TRX ID) is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedTrx = transactionRef.trim().toUpperCase();

    // 1. DUPLICATE TRANSACTION PREVENTION
    const existingBooking = await env.DB.prepare(
      'SELECT id, status FROM bookings WHERE UPPER(transaction_ref) = ?'
    ).bind(normalizedTrx).first();

    if (existingBooking) {
      return new Response(JSON.stringify({
        error: `Duplicate transaction reference detected! Transaction "${transactionRef}" has already been submitted for another booking. Duplicate submissions are strictly prevented.`
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1b. DUPLICATE PUBG UID IN SAME MATCH CHECK
    const cleanPlayerUid = (playerUid || '').trim();
    if (cleanPlayerUid) {
      const existingUidSeat = await env.DB.prepare(
        'SELECT id FROM seats WHERE tournament_id = ? AND player_uid = ? AND status IN ("RESERVED_PENDING", "APPROVED")'
      ).bind(tournamentId, cleanPlayerUid).first();
      if (existingUidSeat) {
        return new Response(JSON.stringify({
          error: `PUBG UID ${cleanPlayerUid} already has an active reservation in this match. Repeated reservations for the same match are not permitted.`
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. CHECK SEAT AVAILABILITY ON SERVER
    const team: any = await env.DB.prepare(
      'SELECT id FROM teams WHERE tournament_id = ? AND team_number = ?'
    ).bind(tournamentId, teamNumber).first();

    if (!team) {
      return new Response(JSON.stringify({ error: `Team ${teamNumber} does not exist.` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    for (const seatNum of seatNumbers) {
      const seat: any = await env.DB.prepare(
        'SELECT status FROM seats WHERE tournament_id = ? AND team_id = ? AND seat_number = ?'
      ).bind(tournamentId, team.id, seatNum).first();

      if (!seat) {
        return new Response(JSON.stringify({ error: `Seat ${seatNum} is invalid.` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (seat.status !== 'AVAILABLE') {
        return new Response(JSON.stringify({ error: `Seat ${seatNum} in Team ${teamNumber} is no longer available.` }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. PRIVATE R2 STORAGE FOR PAYMENT PROOF
    const bookingId = `bkg_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const r2Key = `proofs/${bookingId}.jpg`;

    if (env.PAYMENT_BUCKET && screenshotBase64) {
      const base64Content = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      await env.PAYMENT_BUCKET.put(r2Key, bytes, {
        httpMetadata: {
          contentType: screenshotMime || 'image/jpeg'
        },
        customMetadata: {
          bookingId,
          transactionRef: normalizedTrx,
          uploadedAt: new Date().toISOString()
        }
      });
    }

    // 4. ATOMIC TRANSACTION IN D1
    const accessToken = crypto.randomUUID();
    const count = seatNumbers.length;
    const amount = count === 1 ? 150 : count === 2 ? 300 : count === 4 ? 600 : count * 150;

    const statements: any[] = [
      env.DB.prepare(`
        INSERT INTO bookings (
          id, tournament_id, team_id, team_number, player_name, player_uid,
          contact_number, package_type, seat_count, seat_numbers, amount_pkr,
          payment_method, transaction_ref, screenshot_r2_key, screenshot_mime,
          status, access_token, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
      `).bind(
        bookingId, tournamentId, team.id, teamNumber, playerName, playerUid,
        contactNumber, packageType || 'SOLO', count, JSON.stringify(seatNumbers), amount,
        paymentMethod, normalizedTrx, r2Key, screenshotMime || 'image/jpeg',
        accessToken, Date.now()
      )
    ];

    // Hold seats in pending state
    for (const seatNum of seatNumbers) {
      statements.push(
        env.DB.prepare(`
          UPDATE seats
          SET status = 'RESERVED_PENDING', player_name = ?, player_uid = ?, booking_id = ?, updated_at = ?
          WHERE tournament_id = ? AND team_id = ? AND seat_number = ?
        `).bind(playerName, playerUid, bookingId, Date.now(), tournamentId, team.id, seatNum)
      );
    }

    await env.DB.batch(statements);

    return new Response(JSON.stringify({
      success: true,
      booking: {
        id: bookingId,
        teamNumber,
        seatNumbers,
        amountPkr: amount,
        transactionRef: normalizedTrx,
        status: 'PENDING',
        accessToken
      },
      message: 'Booking submitted and seats locked! Pending administrator payment verification.'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error processing booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
